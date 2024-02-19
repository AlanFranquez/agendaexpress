// Importar las dependencias necesarias
var express = require('express');
const pool = require('../src/db');
const bcrypt = require('bcrypt');
const { AsyncLocalStorage } = require('async_hooks');

var router = express.Router();

// Ruta para obtener todos los usuarios
router.get('/', async (req, res) => {
  if(!req.session.loggedin) {
    return res.redirect('/login');
  }
  try {
    const usuarios = await pool.query('SELECT * FROM agendados WHERE idusuarios=$1', [req.session.userId]);
    res.render('index', { usuarios: usuarios.rows, u: req.session.username});
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).send('Error interno del servidor');
  }
});


router.post('/', async(req, res) => {
  try {
    
    const userId = req.session.userId;
    const {nombre, direccion, telefono} = req.body;

    await pool.query('INSERT INTO agendados(nombre, direccion, telefono, idusuarios) VALUES($1, $2, $3, $4)', [nombre, direccion, telefono, userId]);


    res.redirect('/');

  } catch (error) {
    console.log(error);
  }

});


// Eliminar 
router.post('/delete/:id', async(req, res) => {

  const id = parseInt(req.params.id);

  try {
    
    const consulta = await pool.query('SELECT * FROM agendados WHERE id=$1', [id]);
    
    if(!consulta.rows.length) {
      return res.status(400).send('No se encontro el usuario');
    }

    await pool.query('DELETE FROM agendados WHERE id=$1', [id]);
    res.redirect('/');

  } catch (error) {
    console.log(error);
    res.status(401).send('Hubo un error');
  }

});


// Editar
router.get('/editar/:id', async(req, res) => {

  // Buscar id
  const id = req.params.id;

  

  try {
    const consultar = await pool.query('SELECT * FROM agendados WHERE id=$1', [id]);

    if(!consultar.rows.length) {
      return res.status(401).send('NO SE ENCONTRO USUARIOS');
    }

    res.render('editar', {user: consultar.rows[0]});
  } catch (error) {
    console.log(error);
  }
  
})

router.post('/editar/:id', async(req, res) => {

  // Buscar id
  const id = req.params.id;

  

  try {

    const {nombre, direccion, telefono} = req.body;
    await pool.query('UPDATE agendados SET nombre=$1, direccion=$2, telefono=$3 WHERE id=$4', [nombre, direccion, telefono, id]);
    res.redirect('/');
    
  } catch (error) {
    console.log(error);
  }
  
})


// Ruta para el registro de usuarios
router.get('/register', (req, res) => {
  res.render('register', { title: 'Registro' });
});

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if(req.session.log) {
    res.redirect('/');
  }

  try {
    const comprobarUsuario = await pool.query('SELECT * FROM usuarios WHERE email=$1', [email]);
    if (comprobarUsuario.rows.length > 0) {
      return res.status(400).send('Este correo electrónico ya está en uso');
    }

    const hashpassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO usuarios(username, email, password) VALUES ($1, $2, $3)', [username, email, hashpassword]);

    res.status(201).send('USUARIO REGISTRADO CORRECTAMENTE');
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para el inicio de sesión
router.get('/login', (req, res) => {
  res.render('login', { title: 'Inicio de Sesión' });
});

router.post('/login', async (req, res) => {
  const { username, password, id } = req.body;

  try {
    const consulta = await pool.query('SELECT * FROM usuarios WHERE username=$1', [username]);
    if (consulta.rows.length === 0) {
      return res.status(400).send('Credenciales inválidas');
    }

    const userId = consulta.rows[0].id;

    const compPassword = await bcrypt.compare(password, consulta.rows[0].password);
    if (!compPassword) {
      return res.render('login', { error: 'Credenciales inválidas' });
    }

    req.session.loggedin = true;
    req.session.userId = userId;
    req.session.username = username;
    res.redirect('/');
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(401).send('Error interno del servidor');
  }
});

router.get('/logout', (req, res) => {
  req.session.loggedin = false;

  req.session.destroy((err) => {
    if(err) {
      return res.status(400).send('Hubo un error, no se pudo desloguear');
    } else {
      res.redirect('/login');
    }
  })
})

module.exports = router;
