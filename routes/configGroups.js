const express = require('express');
const router = express.Router();


// #######################################################
// ############# GENERAL VARIABLES #######################
// #######################################################


// ### MECHANISM ###
// the user who perform operations in configGroups need at least to be a admin or owner 2 1
// so this mechanism verify if the user have this permissions before 

router.use((req, res, next) => {
  
  const sql = `SELECT * FROM Usuario u JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE u.idUsuario=? AND ug.idGrupo=? AND ug.tipoUsuario<3`;
  let values = [];
  if(req.query.userId) {
    logger.info('CONFIGGROUPS>> middleware verify user again GET userId=', req.query.userId, ' groupId=', req.query.groupId);
    values = [
      req.query.userId,
      req.query.groupId
    ];
  }
  else {
    logger.info('CONFIGGROUPS>> middleware verify user again POST userId=', req.body.userId, ' groupId=', req.body.groupId);
    values = [
      req.body.userId,
      req.body.groupId
    ];
  }

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('CONFIGGROUPS>> Error in middleware!!!');
      console.log(err.stack); return;
    }
    
    if(data.length) {
      logger.info('CONFIGGROUPS>> User have priviledges to execute these operations, continue...');
      next();
    } else {
      logger.info('CONFIGGROUPS>> User have no privileges to execute this, exit inmediate');
      res.status(401).json({message: 'Middleware says: you have no permissions'});
    }
  });
});

router.use((req, res, next) => {
  console.log('CONFIGGROUPS>> middleware verify if group exist');
  const sql = `SELECT * FROM Grupo WHERE idGrupo=?`;
  const value = (req.query.groupId) ? req.query.groupId : req.body.groupId;
  conn.query(sql, [value], (err, data)=> {
    if(err){
      console.log(err.stack); return;
    }

    if(data.length) {
      logger.info('This Group exist, ok continue with your operations...');
      next();
    } else {
      logger.warn('This group doesn\'t exist, please forgot this');
      res.status(404).json({message: 'MIDDLEWARE says: this group doesn\'t exist'});
    }
  });
});

// #######################################################
// ##################### UPDATE GROUP ####################
// #######################################################

function updateGroup(req, res) {
  const sql = `UPDATE Grupo SET info=?, grupo=?, nombre=? WHERE idGrupo=?`;
  const values = [
    req.body.info,
    req.body.group,
    req.body.groupName,
    req.body.groupId
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error updating a group : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    if(data.affectedRows) {
      res.status(200).json({message: 'The group has been updated'});
    } else {
      res.status(409).json({message: 'Somethings wrong updating this group'});
    }
  });
}

router.put('/update', (req, res)=> {
  logger.info(`GROUPS>> Updating group(${req.body.groupId})`);

  const sql = `SELECT * FROM UsuarioGrupo ug JOIN Grupo g ON ug.idGrupo=g.idGrupo WHERE ug.idUsuario=? AND g.nombre like ? AND g.grupo like ? AND g.idGrupo<>?`;

  conn.query(sql, [req.body.userId, req.body.groupName, req.body.group, req.body.groupId], (err, data) => {
    if(err) {
      logger.error('USERGROUPS>> Internal server error at verify user create group, please fix it');
      res.status(500);
      res.json({message: "Error updating a group for user : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      res.status(401); // Forbidden
      res.json({message: "This group already Exist!!!"});
    } else {
      updateGroup(req,res);
    }

  });

});


// #######################################################
// ###################### ADD USER #######################
// #######################################################

const addUser = (req, res, idUsuarioAdd) => {
  const sql = `INSERT INTO UsuarioGrupo(idUsuario, idGrupo, tipoUsuario) VALUES(?)`;
  const values = [
    idUsuarioAdd,
    req.body.groupId,
    3
  ];

  conn.query(sql, [values], (err, data)=> {
    if(err){
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying add user to group : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(200);
      res.json({message: "User added successfully"});
    } else {
      res.status(401);
      res.json({message: 'Somethings wrong I have no idea'});
    }
  });
}

router.post('/adduser', (req, res)=> {
  
  const sql = `SELECT * FROM Usuario u LEFT OUTER JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE u.email like ? AND ug.idGrupo=?; SELECT * FROM Usuario WHERE email like ?;`;
  const values = [
    req.body.email,
    req.body.groupId,
    req.body.email
  ];

  conn.query(sql, values, (err, data)=> {

    if(err) {
      logger.error('USERGROUPS>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying adding user to group at initial step : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    
    if(data[0].length) {
      res.status(409).json({message: 'User already exist on this group or user doesn\'t exist'});
    } else {
      addUser(req, res, data[1][0].idUsuario);
    }
  });

});

// #######################################################
// ###################### REMOVE USER ####################
// #######################################################


router.delete('/removeuser', (req, res)=> {
  const sql = `DELETE FROM UsuarioGrupo WHERE idUsuario=?`;
    
  conn.query(sql, [req.body.targetUserId], (err, data)=> {
    if(err) {
      logger.error('Error on Delete user');
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      
      res.status(201);
      res.json({message: 'User delted successfully'});
    } else {
      
      res.status(409);
      res.json({message: 'Nothing Change :( maybe user does not exist in this group'});

    }

  });

});

// #######################################################
// ####### GRANT OR REVOQUE USER PRIVILEGES ##############
// #######################################################

router.put('/privileges', (req, res)=> {
  const sql = `UPDATE UsuarioGrupo SET tipoUsuario=? WHERE idUsuario=? and idGrupo=?`;
  const values = [
    req.body.userType,
    req.body.targetUserId,
    req.body.groupId
  ];

  conn.query(sql, values, (err, data)=> {
    if(err){
      logger.error('Error at set privileges');
      console.log(err.stack); return;
    }
    
    if(data.affectedRows) {
      logger.info('User privileges already changed');
      res.status(200).json({message: 'This user privileges has been changed'});
    } else {
      res.status(409).json({message: 'The user might be not found idk'});
    }
    
  });

});


// #######################################################
// ########### GET ALL USERS FOR THIS GROUP ##############
// #######################################################
  
router.get('/allusers', (req, res)=> {

  logger.info('Getting all users of this group');

  const sql = `SELECT u.idUsuario, u.nombre, u.apellido, u.email, ug.tipoUsuario FROM Usuario u JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE ug.idGrupo=? AND u.idUsuario<>?`;
  conn.query(sql, [req.query.groupId, req.query.userId], (err, data)=> {
    if(err) {
      logger.error('CONFIGGROUPS>> Error at get all users');
      console.log(err.stack); return;
    }

    if(data.length) {
      logger.info('All users for this group', data);
      res.status(200).json({message: 'These are all users for this group', userList: data});
    } else {
      res.status(204).json();
    }

  });

});

module.exports = router;
