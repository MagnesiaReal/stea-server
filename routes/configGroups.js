const express = require('express');
const router = express.Router();


// #######################################################
// ############# GENERAL VARIABLES #######################
// #######################################################








// ### MECHANISM ###
// the user who perform operations in configGroups need at least to be a admin or owner 2 1
// so this mechanism verify if the user have this permissions before 

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

router.use((req, res, next) => {
  console.log('CONFIGGROUPS>> middleware verify if group exist');
  const sql = `SELECT * FROM Grupo WHERE idGrupo=?`;
  conn.query(sql, [req.body.groupId], (err, data)=> {
    if(err) throw err;

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
// ###################### ADD USER #######################
// #######################################################

const addUser = (req, res, idUsuarioAdd) => {
  const sql = `INSERT INTO UsuarioGrupo(idUsuario, idGrupo, tipoUsuario) VALUES(?)`;
  const values = [
    idUsuario,
    req.body.groupId,
    3
  ];

  conn.query(sql, [values], (err, data)=> {
    if(err) throw err;

    if(data.affectedRows) {
      res.status(200);
      res.json({message: "User added successfully"});
    } else {
      res.status(401);
      res.json({message: 'Somethings wrong I have no idea'});
    }
  });
}

router.post('/addusertogroup', (req, res)=> {
  
  const sql = `SELECT * FROM Usuario u LEFT OUTER JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE u.email like ? AND ug.idGrupo<>?`;
  const values = [
    req.body.email,
    req.body.groupId
  ];

  conn.query(sql, values, (err, data)=> {

    if(err) throw err;

    if(data.length) {
      addUser(req, res, data[0].idUsuario);
    } else {
      res.json(409); //resource already exist
      res.json({message: 'User already exist or user doesn\'t exist'});
    }
  });

});

// #######################################################
// ###################### DELETE USER ####################
// #######################################################


router.delete('/deleteusertogroup', (req, res)=> {
  const sql = `DELETE FROM UsuarioGrupo WHERE idUsuario=?`;
    
  conn.query(sql, [req.body.userIdDel], (err, data)=> {
    if(err) {
      logger.error('Error on Delete user');
      throw err;
    }

    if(data.affectedRows) {
      
      res.status(200);
      res.json({message: 'User delted successfully'});
    } else {
      
      res.status(409);
      res.json({message: 'Nothing Change :('});

    }

  });

});

// #######################################################
// ####### GRANT OR REVOQUE PRIVILEGES USER ##############
// #######################################################

router.put('/privilegesusertogroup', (req, res)=> {
  const sql = `UPDATE UsuarioGrupo SET tipoUsuario=? WHERE idUsuario=? and idGrupo=?`;
  const values = [
    req.body.userType,
    req.body.userIdMod,
    req.body.groupId
  ];

  conn.query(sql, values, (err, data)=> {
    if(err){
      logger.error('Error at set privileges');
      throw err;
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
  
router.post('/allusersofgroup', (req, res)=> {

  logger.info('Getting all users of this group');

  const sql = `SELECT u.idUsuario, u.nombre, u.apellido, u.email, ug.tipoUsuario FROM Usuario u JOIN UsuarioGrupo ug ON u.idUsuario=ug.idUsuario WHERE ug.idGrupo=? AND u.idUsuario<>?`;
  conn.query(sql, [req.body.groupId, req.body.userId], (err, data)=> {
    if(err) {
      logger.error('CONFIGGROUPS>> Error at get all users');
      throw err;
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
