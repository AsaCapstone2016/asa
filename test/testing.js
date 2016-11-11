/**
 * Created by evan on 11/11/16.
 */
'use strict';
let remindersDAO = require('./../core/database').remindersDAO;

remindersDAO.addReminder("2016-11-11T18:58:25.056Z", "998822520243400", "fb", "eat my food").then(()=> {
});

remindersDAO.getRemindersForDateTime("2016-11-11T18:58:25.056Z").then((results)=> {
    console.log(JSON.stringify(results, null, 2));
});