const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const { response, json } = require('express');
const Clarifai = require('clarifai');

const API = new Clarifai.App({
    apiKey: '972a9d0c28394da09088bb4cbc0c3b8f'}
    );
  //using the old method from the course. Having issues trying to use the new method. http2 error

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',//localhost adress
      user : 'postgres',
      password : 'Vandenis13',
      database : 'smart_brain'
    }
  });

// db.select('*').from('users').then(data => {
//       console.log(data);
//   }); logging all user data for testing before database is completelly setup

const app = express();

app.use(express.urlencoded({extended: false})); //required to read json raw data
app.use(express.json()); //required to read json raw data
app.use(cors());

app.get('/', (req, res) => { res.send('Success') });

app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json('Incorrect form submission');
    }
    db.select('email', 'hash').from('login')
     .where('email', '=', email)
     .then(data => {
         const isValid = bcrypt.compareSync(password, data[0].hash);
         if (isValid) {
             return db.select('*').from('users')
              .where('email', '=', req.body.email)
              .then(user => {
                  res.json(user[0])
              })
              .catch(err => res.status(400).json('Unable to get user'))
         } else {
             res.status(400).json('Wrong credentials')
         }
     })
     .catch(err => res.status(400).json('Wrong credentials'))
})

app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('Incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        name: name,
                        email: loginEmail[0],
                        joined: new Date()
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })
    .catch(err => res.status(400).json('Unable to register'))
})

app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    let found = false;
    db.select('*').from('users').where({id})
     .then(user => {
         if (user.length) {
            res.json(user[0])
         } else {
            res.status(404).json('Not found')
         }
     })
     .catch(err => res.status(404).json('Error getting user'))
})

app.put('/image', (req, res) => {
    const {id} = req.body;
    db('users').where('id', '=', id)
     .increment('entries', 1)
     .returning('entries')
     .then(entries => {
         res.json(entries[0])
     })
     .catch(err => res.status(400).json('Unable to get entries'))
})

app.post('/imageurl', (req, res) => {
    API.models
     .predict(Clarifai.FACE_DETECT_MODEL, req.body.input) 
     .then(data => {
        res.json(data);
     })
     .catch(err => res.status(400).json('Unable to work with API'))
})

app.listen(3000, () => {
    console.log('app is running on port 3000');
});
