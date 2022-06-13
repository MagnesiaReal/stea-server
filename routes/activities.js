const express = require('express');
const router = express.Router();


// CRUD for activities 
// CRUD for activities permissions

// #######################################################
// ############# GENERAL VARIABLES #######################
// #######################################################





// #######################################################
// ########### MECHANISM TO ACCESS ACTIVITES #############
// #######################################################

router.use((req, res, next) => {
  logger.info('ACTIVITIESMIDDLEWARE>> verify user', req.query, req.body);
  
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
  
  console.log(values);

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIESMIDDLEWARE>> Error in middleware!!!');
      console.log(err.stack); return;
    }
    
    if(data.length) {
      logger.info('ACTIVITIESMIDDLEWARE>> User have priviledges to execute these operations, continue...');
      next();// execute the request
    } else {
      logger.info('ACTIVITIESMIDDLEWARE>> User have no privileges to execute this, exit inmediate');
      res.status(401).json({message: 'Middleware says: you have no permissions'});
    }

  });

});

// #######################################################
// ################## CREATE ACTIVITY ####################
// #######################################################

function createActivity(req, res) {
  conn.beginTransaction();
  logger.info(`ACTIVITIES>> User (${req.body.userId}) is creating an activity`);
  const sql = `INSERT INTO Actividad(titulo, descripcion) VALUES (?); INSERT INTO UsuarioActividad(idUsuario, idActividad, tipoPermiso) VALUES(?, LAST_INSERT_ID(), ?)`;

  console.log(req.body);

  const values = [
    [
      req.body.title,
      req.body.description,
    ],
    req.body.userId,
    1
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error creating an activity : INTERNAL SERVER ERROR"});
      conn.rollback();
      console.log(err.stack); return;
    }
      
    if(data[0].affectedRows) {
      conn.commit();
      console.log('idActividad: ', data[0].insertId);
      res.status(200).json({message: "Activity created successfully", activityId: data[0].insertId});
    } else {
      conn.rollback();
      res.status(409).json({message: "We cannot create this activity"});
    }

  });

}

router.post('/create', (req, res)=> {

  logger.info(`ACTIVITIES>> verify if this activity exist`);
  const sql = `SELECT * FROM Actividad a JOIN UsuarioActividad ua ON a.idActividad=ua.idActividad WHERE ua.idUsuario=? AND a.titulo LIKE ?`;

  const values = [
    req.body.userId,
    req.body.title
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error creating an activity : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) { //that means that the group with this name already exist
      res.status(409).json({message: "We cannot create this activity, already exist"});

    } else {
      createActivity(req, res);
    }

  });

});

// #######################################################
// ################## UPDATE ACTIVIDAD ###################
// #######################################################

const updateActivity = function (req, res) {
  const sql = `UPDATE Actividad SET titulo=?, descripcion=?, actividad=? WHERE idActividad=?`;
  const values = [
    req.body.title,
    req.body.description,
    req.body.activity,
    req.body.activityId
  ];
  
  conn.query(sql, values, (err, data) => {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to update this activity at final step : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(200).json({message: 'Activity updated successfully'});
    } else {
      res.status(409).json({message: 'Something is Wrong'});
    }
  })

}

function verifyRepeat(req, res) {
  const sql = `SELECT * FROM Actividad WHERE titulo like ? AND idActividad<>?`;
  conn.query(sql, [req.body.title, req.body.activityId], (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying updating activity : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      res.status(409).json({message: 'Resource already exist, please change name'});
    } else {
      updateActivity(req, res);
    }
  });
}

router.put('/update', (req, res)=> {
  logger.info(`ACTIVITIES>> Updating activity for owner (${req.body.userId})`);

  const sql = `SELECT * FROM Actividad a INNER JOIN UsuarioActividad ua ON a.idActividad=ua.idActividad WHERE ua.idUsuario=? AND ua.idActividad=?`;
  const values = [
    req.body.userId,
    req.body.activityId
  ];
  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to update this activity : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) { // user have privileges to update this activity
      verifyRepeat(req, res);
    } else {
      res.status(401).json({message: 'You have no permissions to update this activity, get out!!!'});
    }

  })

});

// #######################################################
// ############ DELETE ACTIVITY PERMANENTLY ##############
// #######################################################
// just owner can delete these activities and admin can't
const deleteActivity = (req, res, data) => {
  conn.beginTransaction();
  const sql = `DELETE FROM UsuarioActividad WHERE idActividad=?;`+
    `DELETE FROM GrupoActividadResultados WHERE idGrupoActividad IN (SELECT idGrupoActividad FROM GrupoActividad WHERE idActividad=?);`+
    `DELETE FROM GrupoActividad WHERE idActividad=?;`+
    `DELETE FROM Actividad WHERE idActividad=?;`;
  const values = [
    req.body.activityId,
    req.body.activityId,
    req.body.activityId,
    req.body.activityId
  ];

  conn.query(sql, values, (err,data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to deleting an activity final step : INTERNAL SERVER ERROR"});
      conn.rollback();
      console.log(err.stack); return;
    }
    conn.commit();
    if(data[3].affectedRows) {
      logger.info('ACTIVITIES>> Activity deleted successfully - END');
      res.status(200).json({message: 'ACTIVITIES>> Activity deleted successfully'});
    } else {
      res.status(409).json({message: 'Somethings wrong at deleting this activity'});
    }

  });

}


router.delete('/delete', (req, res)=> {
  logger.info(`ACTIVITIES>> Deleting activity(${req.body.activityId}) - START`);

  const sql = `SELECT * FROM Actividad a INNER JOIN UsuarioActividad ua ON a.idActividad=ua.idActividad WHERE ua.idUsuario=? AND ua.idActividad=? AND ua.tipoPermiso=1`;
  const values = [
    req.body.userId,
    req.body.activityId
  ];

  conn.query(sql, values, (err, data) => {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to deleting an activity step 1 verifing user : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    
    if (data.length) {
      deleteActivity(req, res);
    } else {
      res.status(401).json({message: 'Forbbiden operation, actividy does not exist or you have no permissions'});
    }

  });

});

// #######################################################
// ############## ADD ACTIVITY TO A GROUP ################
// #######################################################

function addActivity(req, res) {
  const sql = `INSERT INTO GrupoActividad(idGrupo, idActividad, fechaInicio, fechaFin, modo) VALUES(?)`;
  const values = [
    req.body.groupId,
    req.body.activityId,
    req.body.initDate,
    req.body.endDate,
    req.body.mode
  ];

  conn.query(sql, [values], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error  : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(200).json({message: 'Activity added successfully'});
    } else {
      res.status(409).json({message: 'I have no idea why I cannot insert this activity here'});
    }

  });
}

router.post('/add', (req, res)=> {
  logger.info(`ACTIVITES>> Adding this activity(${req.body.activityId}) to a group(${req.body.groupId})`);
  
  const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=? AND tipoUsuario<3`;
  conn.query(sql, [req.body.userId, req.body.groupId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error  : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      addActivity(req, res);
    } else {
      res.status(401).json({message: 'You have no permissions to remove activities from this group'});
    }

  });
});


// #######################################################
// ############# REMOVE ACTIVITY FROM GROUP ##############
// #######################################################

function removeActivity(req, res) {
  conn.beginTransaction();
  const sql = `DELETE FROM GrupoActividadResultados WHERE idGrupoActividad=?; DELETE FROM GrupoActividad WHERE idGrupoActividad=?;`;
  conn.query(sql, [req.body.groupActivityId, req.body.groupActivityId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error removing an activity from group at finla step: INTERNAL SERVER ERROR"});
      conn.rollback();
      console.log(err.stack); return;
    }
    
    if(data[1].affectedRows) {
      res.status(200).json({message: 'Activity removed successfully'});
      conn.commit();
    } else {
      res.status(409).json({message: 'Activity does not exist or just cannot removed'});
      conn.rollback();
    }

  });
}

router.delete('/remove', (req, res)=> {
  logger.info(`USERACTIVITIES>> Removing this groupActivity(${req.body.groupActivityId})from group(${req.body.groupId})`);
  // first check if user has permissions to delete this activity.
  const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=? AND tipoUsuario<3`;
  conn.query(sql, [req.body.userId, req.body.groupId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error  : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      removeActivity(req, res);
    } else {
      res.status(401).json({message: 'You have no permissions to remove activities from this group'});
    }

  });
  
});

// #######################################################
// ############# UPDATE DATE ACTIVITY ####################
// #######################################################

function updateDate(req, res) { 
  const sql = `UPDATE GrupoActividad SET fechaInicio=?, fechaFin=?, modo=? WHERE idGrupoActividad=?`;
  const values = [
    req.body.initDate,
    req.body.endDate,
    req.body.mode,
    req.body.groupActivityId
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error updating date at last step : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(201).json({message: 'This activityDate has been updated'});
    } else {
      res.status(409).json({message: 'Somethings wrong updating this activityDate'});
    }

  });

}

router.put('/updatedate', (req, res)=> {
  logger.info('ACTIVITIES>> UPDATING ACTIVITY DATE');

  const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=? AND tipoUsuario<3`;
  conn.query(sql, [req.body.userId, req.body.groupId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error updating date at init : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      updateDate(req, res);
    } else {
      res.status(401).json({message: 'You have no permissions to remove activities from this group'});
    }

  });

});

// #######################################################
// ########### GET USER ACTIVITIES BY GROUP ##############
// #######################################################


router.get('/allforgroup', (req, res)=> {
  
  logger.info(`USERACTIVITIES>> get all activities for group(${req.query.userId}) - START`);
  const sql = `SELECT aua.idGrupoActividad, aua.modo, aua.idUsuario ,aua.idGrupo, aua.idActividad, aua.titulo, aua.descripcion, aua.fechaInicio, aua.fechaFin, ua.tipoPermiso, gar.idGrupoActividadResultados, gar.calificacion, gar.resultados`+
    ` FROM AllUsuariosActividades aua LEFT OUTER JOIN UsuarioActividad ua ON aua.idUsuario=ua.idUsuario AND aua.idActividad=ua.idActividad LEFT OUTER JOIN GrupoActividadResultados gar ON aua.idGrupoActividad=gar.idGrupoActividad AND aua.idUsuario=gar.idUsuario WHERE aua.idGrupo=? AND aua.idUsuario=?`;

  conn.query(sql, [req.query.groupId, req.query.userId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error retriving usergroups by id : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    
    if(data.length) {
      res.status(200).json({message: "Take the your activities from these group", activities: data});
    } else {
      res.status(204).send(); // No content
    }


  });


});


// #######################################################
// ######## GET ALL USER ACTIVITIES ######################
// #######################################################
// this is for call all activities that user can access in a group and permission type

router.get('/allforuser', (req, res)=> {
  logger.info('USERACTIVITIES>> get all available user activities');

  const sql = `SELECT aua.idGrupoActividad, aua.idUsuario ,aua.idGrupo, aua.idActividad, aua.titulo, aua.descripcion, aua.fechaInicio, aua.fechaFin, ua.tipoPermiso, gar.idGrupoActividadResultados, gar.calificacion, gar.resultados`+
    ` FROM AllUsuariosActividades aua LEFT OUTER JOIN UsuarioActividad ua ON aua.idUsuario=ua.idUsuario AND  aua.idActividad=ua.idActividad LEFT OUTER JOIN GrupoActividadResultados gar ON aua.idGrupoActividad=gar.idGrupoActividad AND aua.idUsuario=gar.idUsuario WHERE aua.idUsuario=?`;

  conn.query(sql, [req.query.userId], (err, data) => {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to get all user activities : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      res.status(200).json({message: 'take all activities and the permissions user has', activitiesData: data});
    } else {
      res.status(204).send();
    }

  });


});

// #######################################################
// ######## GET ALL OWNER1 ADMIN2 ACTIVITIES #############
// #######################################################

router.get('/allforadmin', (req, res)=> {
  logger.info('ACTIVITIES>> get all available activities for share and edit');

  const sql = `SELECT u.idUsuario, a.idActividad, a.titulo, a.descripcion, ua.tipoPermiso FROM Usuario u, UsuarioActividad ua, Actividad a WHERE u.idUsuario=ua.idUsuario AND ua.idActividad=a.idActividad AND u.idUsuario=?`;
  conn.query(sql, [req.query.userId], (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to get all owner admin activities : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      res.status(200).json({message: 'Take the activities my lord', allAdminActivities: data});
    } else {
      res.status(204).send();
    }
  });

});

// #######################################################
// ############# GET ACTIVITY DATA FOR RESOLVE ###########
// #######################################################
function getActivity(req, res) {
  const sql = `SELECT a.*, ga.* FROM Actividad a INNER JOIN GrupoActividad ga ON ga.idActividad=a.idActividad WHERE idGrupoActividad=?`;
  conn.query(sql, [req.query.activityGroupId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting activity at final step : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    if(data.length) {
      res.status(200).json({message: 'Take the Activity', activityData: data[0]});
    } else {
      res.status(409).json({message: 'Hmmm maybe this activity does not exist'});
    }
  });
}

router.get('/activityresolve', (req, res)=> {
  logger.info(`ACTIVITIES>> get activityData(${req.query.groupId})`);
  const sql = `SELECT * FROM AllUsuariosActividades WHERE idUsuario=? AND idGrupoActividad=?`;
  conn.query(sql, [req.query.userId, req.query.activityGroupId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting activity for resolve : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    if(data.length) {
      req.query.activityId = data[0].idActividad;
      console.log('RES:', req);
      console.log(data[0]);
      getActivity(req, res);
    } else {
      res.status(401).json({message: 'Unauthorized, you cannot get this activity'});
    }
  });
});


function getActivityEdit(req, res) {
  const sql = `SELECT * FROM Actividad WHERE idActividad=?`;
  conn.query(sql, [req.query.activityId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting activity at final step : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    if(data.length) {
      res.status(200).json({message: 'Take the Activity', activityData: data[0]});
    } else {
      res.status(409).json({message: 'Hmmm maybe this activity does not exist'});
    }
  });
}

router.get('/activityedit',(req,  res)=> {
  logger.info(`ACTIVITIES>> get activityData(${req.query.groupId}) for edit`);
  const sql = `SELECT * FROM UsuarioActividad WHERE idUsuario=? AND idActividad=?`;
  conn.query(sql, [req.query.userId, req.query.activityId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting activity for edit : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    if(data.length) {
      getActivityEdit(req, res);
    } else {
      res.status(401).json({message: 'Unauthorized, you cannot get this activity'});
    }
  });
});


// #######################################################
// ### UPDATE OR CREATE USER PERMISSIONS FOR ACTIVITY ####
// #######################################################

function updatePermission(req, res, userActivityId) {
  logger.info(`ACTIVITIES>> Update permissions for target user(${req.body.targetUserId})`);
  const sql = `UPDATE UsuarioActividad SET tipoPermiso=? WHERE idUsuarioActividad=?`;
  conn.query(sql, [req.body.permissionType,userActivityId], (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to update permissions at final step : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(200).json({message: 'the user permissions has been updated successfully'});
    } else {
      res.status(409).json({message: 'Actually whe do not have idea why cannot update this user permission'});
    }
  });
}

function insertPermission(req, res) {
  logger.info(`ACTIVITIES>> insert permissions for target user(${req.body.targetUserId})`);
  const sql = `INSERT INTO UsuarioActividad(idUsuario, idActividad, tipoPermiso) VALUES(?)`;
  const values = [
    req.body.targetUserId,
    req.body.activityId,
    req.body.permissionType
  ];
  conn.query(sql, [values], (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to insert new user permissions : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if (data.affectedRows) {
      res.status(200).json({message: 'The user permissions has been inserted successfully'});
    } else {
      res.status(409).json({message: 'Actually whe do not have idea why cannot insert this user permission'});
    }

  });

}

function updateUserPermission (req, res) {
  // firstly we verify if the user exist in permission table
  const sql = `SELECT idUsuarioActividad FROM UsuarioActividad WHERE idUsuario=? AND idActividad=?`;
  const values = [
    req.body.targetUserId,
    req.body.activityId
  ];
  conn.query(sql, values, (err, data) => {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to change user permissions : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.length) {
      updatePermission(req, res, data[0].idUsuarioActividad);
    } else {
      insertPermission(req, res);
    }
  });
}

router.put('/updatepermission', (req, res)=> {
  logger.info(`ACTIVITIES>> Update permissions but first check if user is owner(${req.body.userId})`);
  const sql = `SELECT * FROM UsuarioActividad WHERE idUsuario=? AND idActividad=? AND tipoPermiso=?`;
  const values = [
    req.body.userId,
    req.body.activityId,
    1
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to update permisisons step 1 : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    
    if(data.length) {
      updateUserPermission(req, res);
    } else {
      res.status(401).json({message: 'User is not authorized to perform this operation, get away from here!!!'});
    }

  });
});


// #######################################################
// ######### GRANT PERMISSIONS TO NEW USER ###############
// #######################################################
// search user by email and grant permissions for this activity

function addPermission(req, res, targetUserId) {
  const sql = `INSERT INTO UsuarioActividad(idUsuario, idActividad, tipoPermiso) VALUES(?)`;
  const values = [
    targetUserId,
    req.body.activityId,
    req.body.permissionType
  ];

  conn.query(sql, [values], (err, data)=> {
    if(err) { 
      logger.error('ACTIVITIES>> Internal server error, please fix it');
      res.status(500).json({message: 'Error trying verifyEmail at final step: INTERNAL SERVER ERROR'});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(200).json({message: 'User permissions added successfully'});
    } else {
      res.status(409).json({messsage: 'User permissions no added, somethings wrong'});
    }
  });

  

}

function verifyPermission(req, res, targetUserId) {
  const sql = `SELECT * FROM UsuarioActividad WHERE idUsuario=? AND idActividad=?`;
  const values = [
    targetUserId,
    req.body.activityId
  ];
  conn.query(sql, values, (err, data)=> {
    if(err) { 
      logger.error('ACTIVITIES>> Internal server error, please fix it');
      res.status(500).json({message: 'Error trying verifyEmail semiFinal step: INTERNAL SERVER ERROR'});
      console.log(err.stack); return;
    }

    if(data.length) {
      res.status(409).json({message: 'This user already have permissions, please update instead add'});
    } else {
      addPermission(req, res, targetUserId);
    }
  });
};


function verifyEmail(req, res) {
  const sql = `SELECT u.idUsuario FROM Usuario u LEFT OUTER JOIN UsuarioActividad ua ON u.idUsuario=ua.idUsuario WHERE u.email like ?`;
  const values = [
    req.body.email,
    req.body.activityId
  ];

  conn.query(sql, values, (err, data)=> {

    if(err) { 
      logger.error('ACTIVITIES>> Internal server error, please fix it');
      res.status(500).json({message: 'Error trying verifyEmail : INTERNAL SERVER ERROR'});
      console.log(err.stack); return;
    }

    if(data.length) {
      verifyPermission(req, res, data[0].idUsuario);
    } else {
      res.status(409); //resource already exist
      res.json({message: 'User already has this permissions or user doesn\'t exist'});
    }
  });
}

router.post('/permissionbyemail', (req, res)=> {
  logger.info(`ACTIVITIES>> Add permissions but first check if user is owner(${req.body.userId})`);
  const sql = `SELECT * FROM UsuarioActividad WHERE idUsuario=? AND idActividad=? AND tipoPermiso=?`;
  const values = [
    req.body.userId,
    req.body.activityId,
    1
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to update permisisons step 1 : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    
    if(data.length) {
      verifyEmail(req, res);
    } else {
      res.status(401).json({message: 'User is not authorized to perform this operation, get away from here!!!'});
    }

  });
  

});


// #######################################################
// ############## REVOKE USER PERMISSIONS ################
// #######################################################
// This action will remove from the groups who owner shared these activities 

function deleteUserPermission(req, res) {
  conn.beginTransaction();
  const sql = `DELETE FROM UsuarioActividad WHERE idUsuario=? AND idActividad=? AND tipoPermiso<>1;`+
    `DELETE FROM GrupoActividad WHERE idGrupo IN (SELECT idGrupo FROM UsuarioGrupo WHERE idUsuario=? AND tipoUsuario=1);`;
  const values = [
    req.body.targetUserId,
    req.body.activityId,
    req.body.targetUserId
  ];

  conn.query(sql, values, (err, data)=> {

    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to deleting user permissions : INTERNAL SERVER ERROR"});
      conn.rollback();
      console.log(err.stack); return;
    }
    conn.commit();
    if(data[0].affectedRows) {
      res.status(200).json({message: 'User permissions revoked successfully'});
    } else {
      res.status(409).json({message: 'Somethings wrong :/ permission does not exist or cannot revoke this permission'});
    }
  });
}

router.delete('/deletepermission', (req, res)=> {
  logger.info(`ACTIVITIES>> Revoke permissions for user(${req.body.targetUserId})`);
  // verify if user is owner
  const sql = `SELECT * FROM UsuarioActividad WHERE idUsuario=? AND idActividad=? AND tipoPermiso=?`;
  const values = [
    req.body.userId,
    req.body.activityId,
    1
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error trying to update permisisons step 1 : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    
    if(data.length) {
      deleteUserPermission(req, res);
    } else {
      res.status(401).json({message: 'User is not authorized to perform this operation, get away from here!!!'});
    }

  });
});


// #######################################################
// ########## GET ALL PERMISSIONS FOR ACTIVITY ###########
// #######################################################

function readPermissions(req, res) {
  const sql = `SELECT * FROM UsuarioActividad WHERE idActividad=? AND idUsuario<>?`;
  conn.query(sql, [req.query.activityId, req.query.userId], (err, data)=> {
    if(err) { 
      logger.error('ACTIVITIES>> Internal server error, please fix it');
      res.status(500).json({message: 'Error trying to read permissions at final step : INTERNAL SERVER ERROR'});
      console.log(err.stack); return;
    }

    if(data.length) {
      res.status(200).json({message: 'This is the list of user that have permissions to edit or share this activity', userList: data});
    } else {
      res.status(204).send();
    }
  });
}

router.get('/allpermissions', (req, res)=> {
  logger.info(`ACTIVITIES>> Get all permissions for this activity(${req.query.activityId})`);

  const sql = `SELECT * FROM UsuarioActividad WHERE idActividad=? AND idUsuario=? AND tipoPermiso=1`;
  const values = [
    req.query.activityId,
    req.query.userId,
  ];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('ACTIVITIES>> Internal server error, please fix it');
      res.status(500).json({message: 'Error trying to read permissions at initial step : INTERNAL SERVER ERROR'});
      console.log(err.stack); return;
    }

    if(data.length) {
      readPermissions(req, res);
    } else {
      res.status(401).json({message: 'You have no permission to read user permissions, go away!!!'});
    }


  });
});


// #######################################################
// ############## SEND ACTIVITY RESULTS  #################
// #######################################################
function setResults(req, res, extra) {
  const sql = `INSERT INTO GrupoActividadResultados(idGrupoActividad, idUsuario, calificacion, resultados) VALUES(?)`;
  const values = [
    req.body.groupActivityId,
    req.body.userId,
    req.body.qualification,
    req.body.results
  ];
  conn.query(sql, [values], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error setting Results : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data.affectedRows) {
      res.status(201).json({message: 'Results has been submitted', extra: extra});
    } else {
      res.status(409).json({message: 'We cannot submit this results'});
    }
  });
}

function userRewards(req, res) {
  const sql = `SELECT * FROM GrupoActividadResultados WHERE idGrupoActividad=?; SELECT * FROM Usuario WHERE idUsuario = ?;`

  conn.query(sql, [req.body.groupActivityId, req.body.userId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error checking the user position in rank : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    const rank = data[0].length + 1;
    let extra = {rank: rank};
    let config = JSON.parse(data[1][0].configuracion);
    if (config === null) config = {};
    if(rank <= 3) {
      switch (rank) {
        case 1:
          if(config.firstPlace) config.firstPlace++;
          else config.firstPlace = 1;
        break;
        case 2:
          if(config.secondPlace) config.secondPlace++;
          else config.secondPlace = 1;
        break;
        case 3:
          if(config.thirdPlace) config.thirdPlace++;
          else config.thirdPlace = 1;
        break;
        default:
          console.log('Never print this line');
      }
      // AQUI DEBERIA IR A LOGISTICA DE UNO O DOS AVATARES PARA LA CALIFICACION FINAL DEL INDIVIDUO
      // //
      // //
      // //
      // //
    }

    if(config.xp) config.xp += req.body.qualification/10;
    else config.xp = req.body.qualification/10;
    extra.xp = req.body.qualification/10;
    extra.grade = req.body.qualification;
    extra = JSON.stringify(extra);
    const configString = JSON.stringify(config);
    const sqlUpdate = 'UPDATE Usuario SET configuracion = ? WHERE idUsuario=?';
    conn.query(sqlUpdate, [configString, req.body.userId], (err, data)=> {
      if(err) {
        logger.error('USERACTIVITIES>> Internal server error, plese fix it');
        res.status(500);
        res.json({message: "Error updating user configs for rewards : INTERNAL SERVER ERROR"});
        console.log(err.stack); return;
      }
      if(data.affectedRows) {
        logger.info("Congratulations this user configs has been updated");
      } else {
        logger.warn("Wow take care, I dont have to be printed, if yes the failure is in update config user for rewards");
      }
      setResults(req, res, extra);
    });

  });
}

router.post('/results', (req, res)=> {
  logger.info(`ACTIVITIES>> Receiving result groupActivity(${req.body.groupActivityId}) from user(${req.body.userId})`);
  const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=(SELECT idGrupo FROM GrupoActividad WHERE idGrupoActividad=?); SELECT * FROM GrupoActividadResultados WHERE idUsuario=? AND idGrupoActividad=?`;
  const values = [req.body.userId, req.body.groupActivityId, req.body.userId, req.body.groupActivityId];

  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error checking if user is in this group : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data[0].length) {
      if(data[1].length) res.status(409).json({message: 'You cannot resubmit results, I know you want to hack the server xd'});
      else userRewards(req, res);
    } else {
      res.status(401).json({message: 'You have no permissions to post results cause you are not in this group'});
    }

  });
});


// #######################################################
// ############### GET ACTIVITY RESULTS  #################
// #######################################################
function getAllResults(req, res) {
  const sql = `SELECT gar.*, u.nombre, u.apellido, u.idAvatar FROM GrupoActividadResultados gar INNER JOIN Usuario u ON gar.idUsuario=u.idUsuario WHERE idGrupoActividad=?`;
  conn.query(sql, [req.query.groupActivityId], (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error getting all results for grop activity : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }
    if(data.length) {
      res.status(200).json({message: 'Take all users results for this activity', resultsData: data});
    } else {
      res.status(204).send();
    }
  });
}

router.get('/results', (req, res)=> {
  logger.info(`ACTIVITIES>> Get all results if you can from user(${req.query.userId})`);
  const sql = `SELECT * FROM UsuarioGrupo WHERE idUsuario=? AND idGrupo=?; SELECT modo FROM GrupoActividad WHERE idGrupoActividad=?; SELECT tipoPermiso FROM UsuarioActividad WHERE idUsuario=? AND idActividad=?`;
  const values = [req.query.userId, req.query.groupId, req.query.groupActivityId, req.query.userId, req.query.activityId];
  conn.query(sql, values, (err, data)=> {
    if(err) {
      logger.error('USERACTIVITIES>> Internal server error, plese fix it');
      res.status(500);
      res.json({message: "Error checking if user is in this group : INTERNAL SERVER ERROR"});
      console.log(err.stack); return;
    }

    if(data[0].length) {
      if(data[2].length) {
        getAllResults(req, res);
      } else {
        if(data[1][0].modo == 1) res.status(401).json({message: 'You cannot get this results because you are not an administrator and it is an exam'});
        else getAllResults(req, res);
      }

    } else {
      res.status(401).json({message: 'You have no permissions to remove activities from this group'});
    }

  });


});


module.exports = router;
