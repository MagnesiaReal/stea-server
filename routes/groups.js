const express = require('express');
const router = express.Router();
randomstring = require('randomstring');


// #######################################################
// ############# GENERAL VARIABLES #######################
// #######################################################
let accessCodes = [];
let timerIdAccess = null;



// ######## AUTHENTICATION MECHANISM######################
// the user need permissions for perform operations here #

router.use((req, res, next) => {
  console.log('CONFIGGROUPS>> middleware verify user again userId=', req.body.userId, ' groupId=', req.body.groupId);
  
  const sql = `SELECT * FROM Usuario u JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE u.idUsuario=? AND ug.idGrupo=? AND ug.tipoUsuario<3`;
  const values = [
    req.body.userId,
    req.body.groupId
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('USERGROUPS>> Error in middleware!!!');
      throw err;
    }
    
    if(data.length) {
      logger.info('User have priviledges to execute these operations, continue...');
      next();
    } else {
      logger.info('User have no priviledges to execute this, exit inmediate');
      res.status(401).json({message: 'Middleware says: you have no permissions'});
    }

  });
});
// #######################################################
// ##################### CREATE GROUP ####################
// #######################################################
function linkUser(req, res, idGrupo) {
  console.log("idGrupo= ", idGrupo);

  const sql = `INSERT INTO UsuarioGrupo(idUsuario, tipoUsuario, idGrupo) VALUES(?)`;
  const values = [
    req.body.userId,
    1, // 1 OWNER, 2 ADMIN, 3 PARTICIPANT
    idGrupo
  ];

  conn.query(sql, [values], (err, data)=> {
    if(err) {
      logger.error('USERGROUPS>> Internal server error at create new group, please fix it');
      res.status(500);
      res.json({message: "Error creating a group for user : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.affectedRows) {
      res.status(201);
      res.json({message: "Group created successfully!!!", idGrupo: idGrupo});
    } else {
      res.status(409); // not created
      res.json({message: "Group not created"});
    }
  });
}

function createNewGroup(req, res) {
  
  let sql = `INSERT INTO Grupo(nombre, info, grupo) VALUES(?)`;
  const values = [
    req.body.groupName,
    `Bienvenido a ${req.body.groupName} del grupo ${req.body.group}, edita este campo para dar mas información a tus estudiantes`,
    req.body.group
  ];

  conn.query(sql, [values], (err, data) => {
    if(err) {
      logger.error('USERGROUPS>> Internal server error at create new group, please fix it');
      res.status(500);
      res.json({message: "Error creating a group for user : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.affectedRows) { 
      sql = `SELECT LAST_INSERT_ID() as idGrupo;`
      conn.query(sql, [], (err, data) => {
        if(err) throw err;

        if(data.length) {
          linkUser(req,res,data[0].idGrupo);
        }
        else {
          logger.error('USERGROUPS>> Unknown error at create new group, fix it');
          res.status(500);
          res.json({message: 'Internal Error again'});
        }

      })
    }

  })
  
}

router.post('/creategroup', (req, res)=> {
  logger.info('USERGROUPS>> create new group for userId: ', req.body.userId);

  const sql = `SELECT * FROM Usuario WHERE idUsuario=? AND uuid=? AND nombre<>?`;

  conn.query(sql, [req.body.userId, req.body.UUID, req.body.groupName], (err, data) => {
    if(err) {
      logger.error('USERGROUPS>> Internal server error at verify user create group, please fix it');
      res.status(500);
      res.json({message: "Error creating a group for user : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.length) {
      createNewGroup(req,res);
    } else {
      res.status(401); // Forbidden
      res.json({message: "You have no permissions for create a group or this group already Exist!!!"});
    }

  });
});

// #######################################################
// ##################### DELETE GROUP ####################
// #######################################################

router.delete('/deletegroup', (req, res) => {

  const sql =`SELECT * FROM Usuario u JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE u.idUsuario=? AND u.uuid=? AND ug.idGrupo=? AND ug.tipoUsuario=1`;
  
  const values = [
    req.body.userId,
    req.body.UUID,
    req.body.groupId
  ];

  //conn.query(sql, values, (err, data)=> {

  //});

});


// #######################################################
// ################ CREATE TOKEN GROUP ###################
// #######################################################


function createGroupToken(req, res) {
  const code = randomstring.generate(9);
  accessCodes.push({code: code, groupId: req.body.groupId});
  
  if (timerIdAccess == null) {

    timerIdAccess = setInterval(()=>{

      if(accessCodes.length) accessCodes.shift();
      else {

        clearInterval(timerIdAccess);
        timerIdAccess = null;

      }

    },259200000); // 3 dias  

  }

  logger.info("Access Token created successfully");
  res.status(200);
  res.json({message: "Access Token generated take this", code: code});

}

function verifyGroupOwner(req, res) {
  const sql = `SELECT tipoUsuario FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=?`;

  conn.query(sql, [req.body.userId, req.body.groupId], (err, data)=> {
    if(err) throw err;

    if(data.length && data[0].tipoUsuario === 1) { // es el owner xd
      createGroupToken(req, res);
    } else {
      res.status(401);
      res.json({message: 'You aren\'t the owner >:('});
    }
  });
}

router.post('/createtokengroup', (req, res) => {
  logger.info('Creating a token for this group');
  
  const sql = `SELECT * FROM Usuario WHERE idUsuario=? AND uuid=?`;
  
  conn.query(sql, [req.body.userId, req.body.UUID], (err, data) => {
    
    if(err) {
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to access to a group : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.length) {
      verifyGroupOwner(req, res);
    } else {
      res.status(401);
      res.json({message: "You have no permissions to perform this operation"});
    }
  })

});


// #######################################################
// ################ ACCESS GROUP BY TOKEN ################
// #######################################################

function insertUserGroup(req, res, accessCredentials) {
  let sql = `INSERT INTO UsuarioGrupo(idUsuario, idGrupo, tipoUsuario) VALUES (?)`;
  let values = [
    req.body.userId,
    accessCredentials.groupId,
    3 // 3 PARTICIPANT
  ];

  conn.query(sql, [values], (err, data) => {
      
    if(err) {
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to access to a group : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.affectedRows) {
      sql = `UPDATE Grupo SET participantes=(SELECT count(*) FROM UsuarioGrupo WHERE idGrupo=? AND tipoUsuario<3) WHERE idGrupo=?`;
      values = [
        req.body.groupId,
        req.body.groupId
      ];

      conn.query(sql, values, (err, data) => {
        if(err) throw err;

        if(data.affectedRows) {
          
          logger.info('USERGROUPS>> User added to this group succesfully');
          res.status(201);
          res.json({message:'You already have the access now'});

        }  else {
          logger.info('USERGROUPS>> User added to this group succesfully but count doesn\'t updated');
          res.status(200);
          res.json({message:'You already have the access now'});  
        }  
      });
      
    } else {
      res.status(401);
      res.json({message:'Unknown error in access'});
    }

  });
}

function groupAccess(req, res) {  
  const accessCredentials = accessCodes.find(ac => ac.code === req.body.code);
  if(accessCredentials) {
    const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=?`;
    conn.query(sql, [req.body.userId, accessCredentials.groupId], (err, data)=> {
      
      if(data.length) {
        res.status(409);
        res.json({message: "This user already exist in this group"});
      } else {
        insertUserGroup(req, res, accessCredentials);
      }

    }) 
  } else {
    res.status(401);
    res.json({message: 'The code doesn\'t exist'});
  }
}

router.post('/accessgroup', (req, res) => {
  logger.info('USERGROUPS>> trying to group access by token');
  
  const sql = `SELECT * FROM Usuario WHERE idUsuario=? AND uuid=?`;
  
  conn.query(sql, [req.body.userId, req.body.UUID], (err, data) => {
    
    if(err) {
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to access to a group : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.length) {
      groupAccess(req, res);
    } else {
      res.status(401);
      res.json({message: "You have no permissions to perform this operation"});
    }
  })

});


// STILL EDITING
router.post('/usergroups', (req,res)=> {

  logger.info('USERGROUPS>> getting groups for userId:', req.body.userId);
  
  let sql = `SELECT * FROM UsuarioGrupo ug JOIN Grupo g ON ug.idGrupo=g.idGrupo WHERE idUsuario=?`;

  conn.query(sql, [req.body.userId], (err, data) => {

    if(err) {

      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting Groups for user : INTERNAL SERVER ERROR"});
      throw err;

    }
    
    if(data.length) {

      res.status(200);
      res.json({
        message: "Retriving these Groups",
        userGroups: data
      });

    } else {
      
      res.status(204); // No content
      res.json({});

    }

  });

})

module.exports = router;
