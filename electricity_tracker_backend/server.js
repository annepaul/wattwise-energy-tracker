const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { expressjwt: jwtMiddleware } = require('express-jwt');
const authenticate = jwtMiddleware({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});



const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    dateStrings: true,//prevent timezone conversion
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
});

// API Endpoints
// User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password, householdSize } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = 'INSERT INTO Users (username, email, password, householdSize) VALUES (?, ?, ?, ?)';
  db.query(sql, [username, email, hashedPassword, householdSize], (err, result) => {
    if (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
    res.status(201).json({ message: 'User registered successfully' });
  });
});



// User Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM Users WHERE username = ?';
  db.query(sql, [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: 'Login successful', token });
  });
});


//to fetch appliance names and default wattages
app.get('/api/appliances', (req, res) => {
  const sql = `SELECT appliance_name,default_wattage FROM Appliances ORDER BY appliance_name`;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching appliances:', err);
      return res.status(500).json({ error: 'Failed to fetch appliances' });
    }
    res.json(results);
  });
});

//daily usage info to draw line chart
app.post('/api/daily-usage', authenticate, (req, res) => {
  const user_id = req.auth?.user_id;
  const sql = `
    SELECT usage_date AS date, SUM(estimated_kwh) AS total_kwh
    FROM Electricity_Usage
    WHERE user_id = ?
    GROUP BY usage_date
    ORDER BY usage_date ASC
  `;
  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('Error fetching daily usage:', err);
      return res.status(500).json({ error: 'Failed to fetch daily usage' });
    }
    res.json(results);
  });
});


// Log Electricity Usage
app.post('/api/log-electricity-usage',authenticate,  (req, res) => {

    console.log('User ID from middleware:', req.auth?.user_id);  // <-- Add this line
    const user_id = req.auth?.user_id;
    

if (!user_id) {
  return res.status(401).json({ error: 'Unauthorized: user_id not found' });
}

    const { appliance, hours_used, wattage, date } = req.body;
    console.log('Received electricity usage:', req.body);

    const getWattageSql = 'SELECT default_wattage FROM Appliances WHERE appliance_name = ?';

    const fetchWattage = new Promise((resolve, reject) => {
        if (wattage) {
            resolve(parseFloat(wattage));
        } else {
            db.query(getWattageSql, [appliance], (err, results) => {
                if (err) {
                    console.error('Error fetching wattage from DB:', err);
                    return reject('Error fetching wattage');
                }

                if (results.length === 0) {
                    return reject('Appliance not found in DB');
                }

                const dbWattage = parseFloat(results[0].default_wattage);
                if (isNaN(dbWattage)) {
                    return reject('Fetched wattage is not a valid number');
                }

                resolve(dbWattage);
            });
        }
    });

    fetchWattage
        .then((finalWattage) => {
            const kwh = (finalWattage * parseFloat(hours_used)) / 1000;

            const insertSql = `
                INSERT INTO Electricity_Usage (user_id, appliance_name, duration_hours, wattage, usage_date, estimated_kwh)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(insertSql, [user_id, appliance, hours_used, finalWattage, date, kwh], (err, result) => {
                if (err) {
                    console.error('Error inserting usage:', err);
                    return res.status(500).json({ error: 'Failed to insert electricity usage' });
                }

                const dailyTotalSql = `
                    SELECT SUM(estimated_kwh) AS total_kwh FROM Electricity_Usage
                    WHERE user_id = ? AND usage_date = ?
                `;

                db.query(dailyTotalSql, [user_id, date], (err, usageResult) => {
                    if (err) {
                        console.error('Error fetching total kWh:', err);
                        return res.status(500).json({ error: 'Failed to fetch daily total' });
                    }

                    const total_kwh = usageResult[0].total_kwh;

                    const getHouseholdSql = `SELECT householdSize FROM Users WHERE user_id = ?`;

                    db.query(getHouseholdSql, [user_id], (err, userResult) => {
                        if (err || userResult.length === 0) {
                            console.error('Error fetching household size:', err);
                            return res.status(500).json({ error: 'User not found' });
                        }

                        const householdSize = userResult[0].householdSize;
                        const threshold = householdSize * 3.3;

                        let reward = 0;
                        if (total_kwh <= threshold) {
                            reward = 10;
                        } else if (total_kwh <= threshold * 1.2) {
                            reward = 5;
                        }

                        const upsertSql = `
                            INSERT INTO DailyRewards (user_id, reward_date, total_kwh, reward_points)
                            VALUES (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE total_kwh = VALUES(total_kwh), reward_points = VALUES(reward_points)
                        `;

                        db.query(upsertSql, [user_id, date, total_kwh, reward], (err) => {
                            if (err) {
                                console.error('Error upserting reward:', err);
                                return res.status(500).json({ error: 'Reward calculation failed' });
                            }

                            return res.status(201).json({
                                message: 'Electricity usage and reward updated successfully',
                                kwh,
                                reward,
                                total_kwh,
                                threshold,
                            });
                        });
                    });
                });
            });
        })
        .catch((err) => {
            console.error('Electricity usage error:', err);
            res.status(500).json({ error: err });
        });
});

            
// Get total electricity usage per appliance for a user
app.post('/api/usage-by-appliance', authenticate, (req, res) => {
    const user_id = req.auth?.user_id;

    const query = `
        SELECT appliance_name, SUM(estimated_kwh) AS total_kwh
        FROM Electricity_Usage
        WHERE user_id = ?
        GROUP BY appliance_name
    `;

    db.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching appliance usage:', err);
            return res.status(500).json({ error: 'Failed to fetch appliance usage' });
        }

        res.json(results);
    });
});


// Fetch Total Reward Points
app.post('/api/get-total-rewards', authenticate, (req, res) => {
    const user_id = req.auth?.user_id;
    const sql = `SELECT SUM(reward_points) AS total_points FROM DailyRewards WHERE user_id = ?`;
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to get rewards' });

        res.json({ total_points: results[0].total_points || 0 });
    });
});

app.post('/api/get-daily-rewards', authenticate, (req, res) => {
  const user_id = req.auth?.user_id;
  const sql = `
    SELECT reward_date, total_kwh, reward_points
    FROM DailyRewards
    WHERE user_id = ?
    ORDER BY reward_date DESC
  `;
  db.query(sql, [user_id], (err, results) => {
    if (err) {
      console.error('Error fetching daily rewards:', err);
      return res.status(500).json({ error: 'Failed to fetch daily rewards' });
    }

    console.log("Returned dates from DB:", results.map(r => r.reward_date)); // 👈 Add this line
    res.json(results);
  });
});



// Add your API endpoints here (e.g., login, register, log water usage)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
