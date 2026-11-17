const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres-db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'banco',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Verificar conexión con PostgreSQL
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consultar monedas, tipos de cuenta y perfiles
app.get('/api/catalogos', async (req, res) => {
  try {
    const monedas = await pool.query('SELECT * FROM moneda WHERE soportada = TRUE');
    const tipos = await pool.query('SELECT * FROM tipo_cuenta');
    const perfiles = await pool.query('SELECT * FROM perfil');
    res.json({ monedas: monedas.rows, tipos_cuenta: tipos.rows, perfiles: perfiles.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar y crear clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cliente ORDER BY id_cliente DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { tipo_documento, num_identificacion, nombres, apellidos, fecha_nacimiento, pais_residencia, email, telefono, id_perfil } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO cliente (tipo_documento, num_identificacion, nombres, apellidos, fecha_nacimiento, pais_residencia, email, telefono, id_perfil)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tipo_documento, num_identificacion, nombres, apellidos, fecha_nacimiento, pais_residencia, email, telefono, id_perfil || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Consultar cuentas y movimientos
app.get('/api/cuentas', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cuenta ORDER BY fecha_apertura DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/movimientos/:num_cuenta', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM v_movimientos WHERE num_cuenta = $1 ORDER BY fecha_hora DESC',
      [req.params.num_cuenta]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar transacción (dispara fn_aplicar_transaccion)
app.post('/api/transacciones', async (req, res) => {
  const { tipo, num_cuenta, num_cuenta_destino, monto, descripcion } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO transaccion (tipo, num_cuenta, num_cuenta_destino, monto, descripcion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tipo, num_cuenta, num_cuenta_destino || null, monto, descripcion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API bancaria escuchando en puerto ${PORT}`);
});