
import nodeCron from 'node-cron';

console.log('Testing node-cron...');
const task = nodeCron.schedule('* * * * * *', () => {
  console.log('Cron tick! ' + new Date().toISOString());
});

setTimeout(() => {
  console.log('Stopping cron test...');
  task.stop();
  process.exit(0);
}, 3500);
