document.querySelector('#status').textContent = 'Ready!';

function updateClock() {
  document.querySelector('#time').textContent = new Date().toLocaleTimeString();
}
updateClock();
setInterval(updateClock, 1000);

document.body.addEventListener('keydown', function(e) {
  if (e.key === 'q') terminal.exit();
});
