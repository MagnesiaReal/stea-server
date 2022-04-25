const express = require('express');
const router = express.Router();


router.post('/userinfo', (req, res)=> {

  logger.info("USERINFO>> retriving avatarUrl for a while");
  logger.info(req.body.avatarId);
  
  let sql = `SELECT avatarUrl FROM Avatar WHERE idAvatar=?`;

  conn.query(sql, [req.body.avatarId], (err, data) => {
    
    if(err) {
      res.status(500);
      res.json({message: "Error reading userinfo"});
    }

    if(data.length) {
      
      logger.info("USERINFO>> sending avatarUrl: ", data[0].avatarUrl);
      res.status(200);
      res.json({
        userData: {
          avatarUrl: data[0].avatarUrl
        }
      });

    }

  });


});

















module.exports = router;
