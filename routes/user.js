const express = require('express');
router = express.Router()
bcrypt = require('bcrypt')

router.post('/login', (req, res) => {
  console.log("accediendo user");
  let sql = `SELECT * FROM Usuario WHERE email=?`;
  
  conn.query(sql, [req.body.email], (err,data,fields)=>{
    console.log("Extracted data -> ", data[0]);
    if (data[0] != undefined) {
      bcrypt.compare(req.body.pass, data[0].pass,(err,result)=>{
        if(err) throw err;
        else if(result){
          console.log("Password comparation is:", result);
          res.json({
            name:data[0].name,
            lastName: data[0].lastName,
            email: data[0].email,
            born: data[0].born,
            admin: data[0].admin,
            login: true
          });
        }
      });
    }
  });

});

router.post('/register',(req,res) => {
  console.log("registrando user");
  let sql = `INSERT INTO Usuario(nombre,apellido,email,nacimiento,admin,pass) VALUES (?)`
  bcrypt.hash(req.body.pass, 10,(err,hash)=>{
    if(err) throw err;
    let values = [
      req.body.name,
      req.body.lastName,
      req.body.email,
      req.body.born,
      0,
      hash
    ];
    
    conn.query(sql, [values], (err,data,fields) => {
      if(err) throw err;
      res.json({
        status: 200,
        messsage: "New User added Succesfully",
        datus: fields
      });
    });
  });
});

module.exports = router;

