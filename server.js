express = require('express');
bodyParser = require('body-parser');
mysql = require('mysql');
cors =  require('cors');
uuid = require('uuid');
logger = require('simple-node-logger').createSimpleLogger('./magnecia_logs/server.log');

userRouter = require('./routes/user');
userInfoRoutes = require('./routes/userInfo');
groups = require('./routes/groups');
configGroups = require('./routes/configGroups');
userActivities = require('./routes/activities');


logger.info("Trying to start server");

const port = 80;

conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1204",
  database: "SteaDB",
  multipleStatements: true
});

conn.connect((err) => {
  if (err) throw err;
  console.log("Connected");
});

app = express();
app.use(express.json()); // Parser data as Json
app.use(express.urlencoded({extended: true}));
app.use(cors());

//ruta estatica
app.use(express.static('/home/magneciareal/Desktop/stea_data'));

app.use('/user', userRouter);
app.use('/userinfo', userInfoRoutes);
app.use('/group', groups);
app.use('/groupconf', configGroups);
app.use('/activity', userActivities);



app.get('/', (req, res) => {
  res.json({mensaje : "Bienvenido al servidor Franchesco Virgoliniiiiiii!!!!!!!!! FIIIUUUM"});
  console.log("SomeOne Enter to Franchesco FIIIIIUUUUUUUUMMMMMMMMMM");
  console.log(req.body);
});


app.post('/secret/activity', (req, res)=> {
  logger.info('\n\n\n\n\n\n THIS IS A BIG SECRET STILL HIDE PLEASE \n\n\n\n\n\n\n');
  const sql = `UPDATE Actividad SET titulo=?, descripcion=?, actividad=? WHERE idActividad=?`;  
  const jsonMoc={
    id:0,
    type:1,
    preguntas:[
      {IDMapa:1,IDPregunta:1,Cuerpo:"Estado de la republica donde se tiene más turismo",Resp:"ROO",Tiempo:5},
      {IDMapa:2,IDPregunta:2,Cuerpo:"Estado de la republica donde vivimos",Resp:"MEX",Tiempo:5},
      {IDMapa:3,IDPregunta:3,Cuerpo:"Estado de la republica más grande",Resp:"CHH",Tiempo:5}
    ]
  }
    
  const credentials = {
    userId: 48,
    UUID: "b40b63b5-a1ee-4be8-8432-25c6364fc7c4",
    activityId: 18,
    title: "PRIMER ACTIVIDAD 2 33",
    description : "this is my fist activitiy it could be a HTML code",
    activity: JSON.stringify([jsonMoc])
  };

  const values = [
    credentials.title,
    credentials.description,
    credentials.activity,
    credentials.activityId
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

});

app.listen(port, ()=>{
  logger.warn("simple warn alv");
  logger.info("Server alredy up to listen any request");
});
