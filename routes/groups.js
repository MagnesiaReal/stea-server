const express = require('express');
const router = express.Router();
randomstring = require('randomstring');


// #######################################################
// ############# GENERAL VARIABLES #######################
// #######################################################
let accessCodes = [];
let timerIdAccess = null;



// ######## AUTHENTICATION MECHANISM ###################### MIDDLEWARE
// the user need permissions for perform operations here #

router.use((req, res, next) => {

  logger.info('GROUPSMIDDLEWARE>> verify user again');
  
  const sql = `SELECT * FROM Usuario WHERE idUsuario=? AND uuid=?`;
  let values = [];
  if(req.query.userId) values = [
    req.query.userId,
    req.query.UUID
  ];
  else values = [
    req.body.userId,
    req.body.UUID
  ];
  
  console.log(values)

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('GROUPSMIDDLEWARE>> Error in middleware!!!');
      throw err;
    }
    
    if(data.length) {
      logger.info('GROPSMIDDLEWARE>> User have privileges to execute these operations, continue...');
      next();// execute the request
    } else {
      logger.info('User have no privileges to execute this, exit inmediate');
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

router.post('/create', (req, res)=> {
  logger.info('USERGROUPS>> create new group for userId: ', req.body.userId);
  // fist check if the group name already exist, there cannot be two groups with the same name
  const sql = `SELECT * FROM UsuarioGrupo ug JOIN Grupo g ON ug.idGrupo=g.idGrupo WHERE ug.idUsuario=? AND g.nombre like ? AND g.grupo like ?`;

  conn.query(sql, [req.body.userId, req.body.groupName, req.body.group], (err, data) => {
    if(err) {
      logger.error('USERGROUPS>> Internal server error at verify user create group, please fix it');
      res.status(500);
      res.json({message: "Error creating a group for user : INTERNAL SERVER ERROR"});
      throw err;
    }

    if(data.length) {
      res.status(401); // Forbidden
      res.json({message: "This group already Exist!!!"});
    } else {
      createNewGroup(req,res);
    }

  });
});

// #######################################################
// ##################### DELETE GROUP ####################
// #######################################################

function deleteAllData(req, res) {
  conn.beginTransaction();
  const sql = `DELETE FROM GrupoActividad WHERE idGrupo=?; DELETE FROM GrupoActividadResultados WHERE idGrupoActividad IN (SELECT ga.idGrupoActividad FROM GrupoActividad ga WHERE ga.idGrupo=?); DELETE FROM UsuarioGrupo WHERE idGrupo=?; DELETE FROM Grupo WHERE idGrupo=?`;

  const chain = [
    req.body.groupId,
    req.body.groupId,
    req.body.groupId,
    req.body.groupId
  ];

  conn.query(sql, chain, (err, data) => {
    if(err) {
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to deleting this group : INTERNAL SERVER ERROR"});
      conn.rollback();
      throw err;
    }
    conn.commit();
    if(data[3].affectedRows) {
      res.status(200).json({message: 'Group deleted successfully'});
    } else {
      res.status(409).json({message: 'Something is wrong, group still exist'});
    }

  });
  


}

router.delete('/delete', (req, res) => {

  logger.info('DELETEGROUP>> deleting a group');

  const sql = `SELECT * FROM UsuarioGrupo WHERE idGrupo=? AND idUsuario=? AND tipoUsuario=?`;
  
  const values = [
    req.body.groupId,
    req.body.userId,
    1
  ];

  conn.query(sql, values, (err, data) => {
    if(err) {
      throw err;
    }

    if (data.length) { // user is the owner
      deleteAllData(req, res);
    } else {
      res.status(401).json({message: 'Forbbiden operation!!! you might not be the owner'});
    }

  });

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


router.post('/createtoken', (req, res) => {
  logger.info('Creating a token for this group');
  
  const sql = `SELECT tipoUsuario FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=?`;

  conn.query(sql, [req.body.userId, req.body.groupId], (err, data)=> {
    if(err) throw err;

    if(data.length && data[0].tipoUsuario < 3) { // es el owner o el admin
      
      logger.info('GROUPS>> verify if access token exist or expires');
      const accessCode = accessCodes.find(ac => ac.groupId === req.body.groupId);
      
      if(accessCode) res.status(200).json({message: 'The access token already exist, take that', code: accessCode.code});
      else createGroupToken(req, res);

    } else {
      res.status(401);
      res.json({message: 'You need to be a owner or admin to generate the token >:('});
    }
  });

});


// #######################################################
// ################ ACCESS GROUP BY TOKEN ################
// #######################################################

function insertUserGroup(req, res, accessCredentials) {
  let sql = `INSERT INTO UsuarioGrupo(idUsuario, idGrupo, tipoUsuario) VALUES (?); SELECT LAST_INSERT_ID() as idGrupo;`;
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

    if(data[0].affectedRows) {
      console.log(data);
      res.status(201).json({message: "You alredy hve the access now", idGrupo: data[1][0].idGrupo});     
    } else {
      res.status(409);
      res.json({message:'Unknown error in access'});
    }

  });
}

router.post('/access', (req, res) => {
  logger.info(`USERGROUPS>> trying to grant access to user(${req.body.userId}) via token`);

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
});


// #######################################################
// ###################### GET USER GROUPS ################
// #######################################################

router.get('/allforuser', (req,res)=> {

  logger.info('USERGROUPS>> getting groups for userId:', req.body.userId);
  
  // let sql = `SELECT * FROM UsuarioGrupo ug JOIN Grupo g ON ug.idGrupo=g.idGrupo WHERE ug.idUsuario=?`;
  let sql = `SELECT pg.idGrupo, pg.nombreGrupo, pg.grupo, pg.idUsuario, pg.nombreUsuario, ug.tipoUsuario FROM PropietarioGrupo pg JOIN UsuarioGrupo ug ON pg.idGrupo=ug.idGrupo AND ug.idUsuario=?`;

  conn.query(sql, [req.query.userId], (err, data) => {

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
      res.status(204).send(); // No content
    }

  });

});

// #######################################################
// ###################### GET GROUP DATA #################
// #######################################################

function getGroup(req, res) {
  logger.info(`Getting group(${req.query.groupId}) info`);

  const sql = `SELECT * FROM Grupo WHERE idGrupo=?`;

  conn.query(sql, [req.query.groupId], (err, data)=> {
    if(err) {
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to get groupinfo : INTERNAL SERVER ERROR"});
      throw err; 
    }

    if(data.length) {
      res.status(200).json({message: 'this is the group data', groupData: data[0]});
    } else {
      res.status(404).json({message: 'this group doesn\'t exist'});
    }

  });
}


router.get('/group', (req, res)=> {
  
  logger.info(`GROUPS>> Verify if user is in this group(${req.query.groupId})`);
  const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=?`;

  conn.query(sql, [req.query.userId, req.query.groupId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting group info : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      getGroup(req, res);
    } else {
      res.status(401).json({message: 'This user have no permissions to get groupData'});
    }
  })


});

module.exports = router;


// #######################################################
// ################### EXIT FROM A GROUP #################
// #######################################################


router.delete('/exit', (req, res)=> {
  logger.info(`GROUPS>> Exit from this group(${req.body.groupId})`);

  const sql = `DELETE FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=? AND tipoUsuario<>1`;
  const values = [
    req.body.userId,
    req.body.groupId
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error error removing the user from this group : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(200).json({message: 'Exit from this group successfully'});
    } else {
      res.status(409).json({message: 'Hmmm maybe this user does not exist in this group or is the owner'});
    }
  })
});
