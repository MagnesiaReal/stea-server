const express = require('express');
router = express.Router()
bcrypt = require('bcrypt')

nodemailer = require('nodemailer');
randomstring = require('randomstring');

// #######################################################
// ####################### LOGIN USER ####################
// #######################################################
router.post('/login', (req, res) => {

  logger.info("LOGIN>> checking credentials");

  let sql = `SELECT idUsuario, nombre, apellido, nacimiento, admin, foto, configuracion, idAvatar, uuid, pass FROM Usuario WHERE email=?`;

  conn.query(sql, [req.body.email], (err,data)=>{
    if(err) throw err;

    logger.warn("LOGIN>> Extracted data -> ", data[0]);
    
    if (data.length > 0) {

      bcrypt.compare(req.body.pass, data[0].pass,(err,result)=>{

        logger.debug("LOGIN>> Password comparation is: ", result);
    
        if(err) throw err;
        else if(result){
          
          let userData = data[0];
          delete userData.pass;
          res.status(200);
          res.json({
            message: "Ok you've been verified, take your user data :)",
            userData: userData
          });

        } else {
          
          res.status(403); // Forbidden, incorrect pass maybe
          res.json({
            message: "Incorrect pass or user I dont know, I'm a simple server"
          });
          
        }

      });
    } else {
      res.status(401); // ok not found this email xd
      res.json({
        message: "Incorrect user or pass I dont know... or maybe yes..."
      });
    }
  });


});

// #######################################################
// ################### REGISTER NEW USER #################
// #######################################################
let verifications = [];
let timerId = null;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'stea.tesis.a003@gmail.com',
    pass: 'steatesisA003'
  }
});

function sendVerificationMail(req, res) {

  const code = randomstring.generate(6);
  const mailtext = 'Este es tu codigo de verificación para STEA, rápido expira en 30 minutos, go fast!!!\n Codigo: ' + code;
  

  const mailOptions = {
    from: 'stea.tesis.a003@gmail.com',
    to: req.body.email,
    subject: 'STEA Verification mail',
    text: mailtext
  }
  
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {

      logger.error("REGISTER>> error: ", err);
      res.status(401);
      res.json({
        message: "Invalid email or doesn't exist"
      });

    }
    else {

      // at this point the user have 30 minutes to verify the account
      logger.info("REGGISTER>> Email sent: ", info.response);
      console.log(info.response);

      verifications.push({email: req.body.email, code: code});
      if (timerId == null) {

        timerId = setInterval(()=>{

          if(verifications.length) verifications.shift();
          else {

            clearInterval(timerId);
            timerId = null;

          }

        }, 1800000);  

      }

      logger.info("REGISTER>> User has thirty minuts to verify him account");
      res.status(200);
      res.json({
        message: "Valid information, please verify this user"
      });

    }

  });
  
}

router.post('/register',(req,res) => {

  logger.info("REGISTER>> registering user");

  let sqlexist = `SELECT * FROM Usuario WHERE email=?`;
  conn.query(sqlexist, [req.body.email], (err, data)=> {    
    if(err) throw err;

    logger.info("REGISTER>> data.length: ", data.length);
      
    if(data.length === 0) {
      sendVerificationMail(req, res);
    } else {
      logger.warn("REGISTER>> Email already exist: ", req.body.email);
      res.status(409);// Resource conflict
      res.send("Email already exist");
    }
  });

});

function sendVerifyCredentials(req, res) {
  const sql = `SELECT idUsuario, uuid FROM Usuario WHERE email=?`;

  conn.query(sql, [req.body.email],(err, data)=>{

    if(err) {

      logger.error("VERIFY>> Internal server error at sendVerifyCredentials");
      console.log(err);
      res.status(500);
      res.json({
        message: "Internal Server Error plase try again later"
      });
      throw err;

    }
    res.status(200); // Succesfully
    res.json({
      message: "Usuario registrado con éxito",
      uuid: data[0].uuid,
      idUsuario: data[0].idUsuario
    });  

  });
}

function insertNewUser(req, res) {

  unicUserId = uuid.v4();

  let sql = `INSERT INTO Usuario(nombre,apellido,email,nacimiento,admin,pass, uuid) VALUES (?)`;
  bcrypt.hash(req.body.pass, 10,(err,hash)=>{
  
    if(err) throw err;
    
    let values = [
      req.body.name,
      req.body.lastName,
      req.body.email,
      req.body.born,
      0,
      hash,
      unicUserId
    ]; 
    conn.query(sql, [values], (err,data) => {
      
      if(err) {


        logger.error("VERIFY>> Internal server error");
        console.log(err);
        res.status(500);
        res.json({
          message: "Internal Server Error plase try again later"
        });
        throw err;

      }
      else {

        logger.info("VERIFY>> Server send a success response");
        sendVerifyCredentials(req, res);

      }
      
    });

  });

}

router.post('/verify', (req, res) => {

  // dont forget this query, might useful in the future
  //let sql = `INSERT INTO Usuario(nombre,apellido,email,nacimiento,admin,pass, uuid) SELECT ? WHERE NOT EXISTS (SELECT * FROM Usuario WHERE email = ?)`;
  const verification = verifications.find(v => (v.email === req.body.email && v.code === req.body.code));
  if(verification) {

    verifications.slice(verifications.findIndex(v => (v.email === req.body.email && v.code === req.body.code)),1);
       
    logger.info("VERIFY>> Verified account succesfully");
    insertNewUser(req, res);

  } else {
      
    logger.warn("VERIFY>> hmmm... user sent a wrong code or time expired");
    res.status(401);
    res.json({
      message: "Wrong code I think, or time expired"
    });
    
  } 

});



// #######################################################
// ################## CHECK USER SESSION #################
// #######################################################
router.post('/checksession', (req,res) => {
  let sql = `SELECT idUsuario, nombre, apellido, email, nacimiento, admin, foto, configuracion, idAvatar FROM Usuario WHERE uuid = ?`;
  let values = [
    req.body.UUID
  ];
  logger.info("CHECKSESSION>> UUID: ", req.body.UUID);
  conn.query(sql, [values], (err,data, fields) => {
    if(err) throw err;
    logger.info("CHECKSESSION>> data recovered: ", data);
    if(data.length) {
      res.status(200)
      .json({
        message: "SessionSuccesfully",
        userData: data[0]
      });
    } else {
      logger.error("CHEKSESSION>> Invalid user or session expired");
      res.status(401)
      .json({
        message: "this session has expired"
      });
    }
  })
});

router.put('/newregister', (req, res) => {

  logger.info("NEWREGISTER>> avatar and image: ", req.body);
  let sql = `UPDATE Usuario SET idAvatar=?, configuracion=?, foto=? WHERE uuid = ?`;
  let values = [
    req.body.idAvatar,
    req.body.configuration,
    req.body.photo,
    req.body.UUID
  ]

  conn.query(sql, values, (err, data) => {
    if (err) throw err;

    if (data.affectedRows) {

      res.status(200);
      res.json({message: "User registered at all"});

    }
    else {

      res.status(401);
      res.json({message: "User not found"});

    }
  });

});


router.get('/avatars', (req, res) => {
  
  let sql = `SELECT * FROM Avatar`;
  
  conn.query(sql, [], (err, data) => {
    
    if(err) throw err;
    console.log("retriving Avatars Cataloge for newregister");
    if(data.length) {
      res.status(200);
      res.json({
        avatars: data
      });
    } else {
      res.status(401);
      res.json({message: "Ok I could not find Avatars :("});
    }
    
  })
})

module.exports = router;

