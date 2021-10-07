const socket = io();
const my = {
  id: '',
  playername: ''
}
/************************************************
***Landing Page Code Section --------------------
*************************************************/

window.onload = () => {  
  if (localStorage.getItem('playername')) nameInputL.setAttribute('value', localStorage.getItem('playername'));
};

const joinRoomBtnL = document.querySelector('#join-room');
const createRoomBtnL = document.querySelector('#create-room');
const nameInputL = document.querySelector('#name-landing-input');
const params = window.location.toString().substring(window.location.toString().indexOf('?'));
const searchParams = new URLSearchParams(params);
const landingPage = document.querySelector('#landing');
const settingsPage = document.querySelector('#settings');

//new player or joinee
if (searchParams.has('id')) {
  socket.emit('roomExists', { id: searchParams.get('id')});
  socket.on('roomExists', (data) => {
    if(!data.exist)
      window.location.href = '/';    
  });
  joinRoomBtnL.addEventListener('click', () => {
    if(landingToSettings())
      settingsAsPlayer();
  });
} else {
  createRoomBtnL.addEventListener('click', () => {
    if(landingToSettings())
      settingsAsOwner();
  });
}
function landingToSettings(){
  if(nameInputL.value.trim() === ''){
    toastTopAlert(
      "Missing Data :(",
      "Don't you have a name? Don't leave that box empty. Okay?",
      "alert-danger"
    );
    return false;
  }
  landingPage.remove();
  settingsPage.classList.remove('d-none');
  settingsPage.classList.add('d-flex');
  localStorage.setItem('playername', nameInputL.value.trim());
  my.playername = nameInputL.value.trim();
  return true;
}


/************************************************
***Settings Page Code Section --------------------
*************************************************/

const copyInvite = document.querySelector('#copy-link');

copyInvite.addEventListener('click', (e) => {
  e.preventDefault();
  toastTopAlert(
    "Link Copied Successfully",
    "Now share the copied link and ask your friends to join (If you have any 😜)",
    "alert-success"
  );
  copyInvite.select();
  document.execCommand('copy');
});

if (searchParams.has('id')) {
  copyInvite.value = `${window.location.protocol}//${window.location.host}/?id=${searchParams.get('id')}`;
}

//Settings page as other Player--
function settingsAsPlayer(){
  document.querySelector('#rounds').setAttribute('disabled', true);
  document.querySelector('#draw-time').setAttribute('disabled', true);
  document.querySelector('#start-game').setAttribute('disabled', true);
  my.id = socket.id;
  putPlayer(my);
  socket.emit('joinRoom', { id: searchParams.get('id'), player: my });  
}


//Settings page as Room Owner--
function settingsAsOwner(){
  document.querySelector('#rounds').addEventListener('change', updateSettings);
  document.querySelector('#draw-time').addEventListener('change', updateSettings);
  my.id = socket.id;
  socket.emit('newPrivateRoom', my);
  socket.on('newPrivateRoom', (data) => {
    copyInvite.value = `${window.location.protocol}//${window.location.host}/?id=${data.gameID}`;
    putPlayer(my);
  });
}

//get rest of the players
socket.on('joinRoom', putPlayer);
socket.on('otherPlayers', (players) => players.forEach((player) => putPlayer(player)));
//Socket on Disconnection of players
socket.on('disconnection', async (player) => {
  if (document.querySelector(`#player-${player.id}`)) {
    document.querySelector(`#player-${player.id}`).remove();
  }
  if (document.querySelector(`#score-player-${player.id}`)) {
    document.querySelector(`#score-player-${player.id}`).remove();
  }
  toastTopAlert(
    `${player.playername} has Left The Room`,
    "He/She doesn't like you 😢 It's okay, you are precious ❤️",
    "alert-secondary"
  );
  socket.emit('roomExists', { id: searchParams.get('id')});
  socket.on('roomExists', (data) => {
    if(!data.exist && !document.querySelector('#settings')){
      toastTopAlert(
        `Room closed because of Less Participants`,
        "Again gather all your buddies 😢 Believe me It will be fun ❤️",
        "alert-danger"
      );
      window.setTimeout(function() {
        window.location.href = '/';
    }, 5000);
    }
  });
});

//put players in the UI
function putPlayer(player){
  let settingsPlayersSection = document.querySelector('#settings-players');
  settingsPlayersSection.innerHTML += `<li id="player-${player.id}">${player.playername}</li>`
  if(player.id != my.id){
    toastTopAlert(
      `${player.playername} has Joined The Room`,
      "So, you have friends hah? Great... ❤️",
      "alert-success"
    );
  }  
}

//update games settings
function updateSettings(e) {
  e.preventDefault();
  socket.emit('settingsUpdate', {
      rounds: document.querySelector('#rounds').value.trim(),
      time: document.querySelector('#draw-time').value.trim()
  });
}

socket.on('settingsUpdate', (data) => {
  document.querySelector('#rounds').value = data.rounds;
  document.querySelector('#draw-time').value = data.time;
});


// start game action:
document.querySelector('#start-game').addEventListener('click', (e) => {
  if(document.querySelector('#settings-players').children.length < 2){
    toastTopAlert(
      "Only 1 participant",
      "Please invite your friends. Don't you have any friends? Oww 🥺",
      "alert-secondary"
    );
  }
  else{    
    updateSettings(e);
    insertGameScreen();
    socket.emit('startGame');
    socket.emit('getPlayers');
  }
});

function insertGameScreen(){
    document.querySelector('#settings').remove();
    document.querySelector('#game-screen').classList.remove('d-none');
    document.querySelector('#game-screen').classList.add('d-flex');
    // Ready Video on Game Start
    videoReadyFromUser();
}


/************************************************
*************************************************/
/************************************************
***Game Section--------------------
*************************************************/
/************************************************
*************************************************/

let timerID = 0;
let pickWordID = 0;

socket.on('startGame', insertGameScreen);
socket.on('getPlayers', (players) => createScoreCard(players));
socket.on('message', appendMessage);
socket.on('closeGuess', (data) => appendMessage(data, { closeGuess: true }));
socket.on('correctGuess', (data) => appendMessage(data, { correctGuess: true }));
socket.on('lastWord', ({ word }) => appendMessage({ message: `The word was ${word}` }, { lastWord: true }));
socket.on('startTimer', ({ time }) => startTimer(time));

function createScoreCard(players) {
  document.querySelector('#sidebar-scoreboard').innerHTML = '';
  players.forEach((player) => {
    document.querySelector('#sidebar-scoreboard').innerHTML +=
      `<p id="score-player-${player.id}"><b>${player.playername}: </b><span class="score-${player.id}">Score: 0</span></p>`;    
  });
}

// On message entered
document.querySelector('#guess-input').addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    afterMsgEntered();
  }
});;
document.querySelector('#guess-input-btn').addEventListener('click', afterMsgEntered);
function afterMsgEntered(){
  if(document.querySelector('#guess-input').value.trim().length !== 0){
    let message = document.querySelector('#guess-input').value.trim();
    document.querySelector('#guess-input').value = '';
    socket.emit('message', { message });
  }
}

function appendMessage({ playername = '', message, id }, { correctGuess = false, closeGuess = false, lastWord = false } = {}) {
  let playerNameMsg = '' 
  let messageSection = document.querySelector('#message-section')
  if (playername !== '') {
    messageSection.innerHTML += `<p><b>${playername}: </b>${message}</p>`;
    messageSection.scrollTop = messageSection.scrollHeight;
    return;
  }
  if (correctGuess) {
    document.querySelector(`#score-player-${id}`).classList.add('text-success');
    messageSection.innerHTML += `<p class="text-success">${message}</p>`;
    messageSection.scrollTop = messageSection.scrollHeight;
    return;
  }  
  if(closeGuess){
    messageSection.innerHTML += `<p class="text-secondary">${message}</p>`;
    messageSection.scrollTop = messageSection.scrollHeight;
    return;
  }
  if(lastWord){
    messageSection.innerHTML += `<p class="bg-dark p-10 rounded">${message}</p>`;
    messageSection.scrollTop = messageSection.scrollHeight;
    return;
  }
}

// Frontend Timer
function startTimer(ms) {
  let secs = ms / 1000;
  const id = setInterval((function updateClock() {
    if (secs === 0) clearInterval(id);
    document.querySelector('#clock').textContent = secs;
    secs--;
    return updateClock;
  }()), 1000);
  timerID = id;
  document.querySelectorAll('#sidebar-scoreboard > .text-success').forEach((playerScore) => playerScore.classList.remove('text-success'));
}

socket.on('chooseWord', async ([word1, word2, word3]) => {
  socket.emit('getCurrentDrawer'); 
  document.querySelector('#words-section').innerHTML = `
    <button class="btn m-5 bg-transparent border word-btn1" type="button">${word1}</button>
    <button class="btn m-5 bg-transparent border word-btn2" type="button">${word2}</button>
    <button class="btn m-5 bg-transparent border word-btn3" type="button">${word3}</button>
  `;
  document.querySelector('.word-btn1').addEventListener('click', () => chooseWord(word1));
  document.querySelector('.word-btn2').addEventListener('click', () => chooseWord(word2));
  document.querySelector('.word-btn3').addEventListener('click', () => chooseWord(word3));

  document.querySelector('#word-modal').classList.remove('d-none');
  document.querySelector('#word-modal').classList.add('d-flex');
  document.querySelector('#clock').textContent = 0;
  clearInterval(timerID);
  pickWordID = setTimeout(() => chooseWord(word2), 15000);  
});

function chooseWord(word) {
  clearTimeout(pickWordID); 
  socket.emit('chooseWord', { word });
  document.querySelector('#word-modal').classList.remove('d-flex');
  document.querySelector('#word-modal').classList.add('d-none');
  //Word chosen
  //Hide Send msg section
  document.querySelector('#send-msg-section').classList.remove('d-flex');
  document.querySelector('#send-msg-section').classList.add('d-none');
  //Enable Drawer Section
  document.querySelector('#drawer-section').classList.remove('d-none');
  document.querySelector('#drawer-section').classList.add('d-flex');
  //Add chosen word
  document.querySelector('#chosen-word').innerHTML = word;
}

socket.on('choosing', ({ player }) => {
  socket.emit('getCurrentDrawer'); 
  let messageSection = document.querySelector('#message-section');
  messageSection.innerHTML += `<b>${player.playername}</b> is choosing a word`;
  messageSection.scrollTop = messageSection.scrollHeight;
  clearInterval(timerID);
  //Someone else is choosing
  //Hide Drawer Section
  document.querySelector('#drawer-section').classList.remove('d-flex');
  document.querySelector('#drawer-section').classList.add('d-none');
  //Enable Send msg section
  document.querySelector('#send-msg-section').classList.remove('d-none');
  document.querySelector('#send-msg-section').classList.add('d-flex');
});

// Update the scores
socket.on('updateScore', ({
  playerID,
  score,
  drawerID,
  drawerScore,
}) => {
  document.querySelector(`.score-${playerID}`).textContent = `${score}`;
  document.querySelector(`.score-${drawerID}`).textContent = `${drawerScore}`;
  if(playerID == my.id){
    document.querySelector('#my-score-content').innerHTML = 
      `<p><b>My Score: </b>${score}</p>`;
  }
  if(drawerID == my.id){
    document.querySelector('#my-score-content').innerHTML = 
      `<p><b>My Score: </b>${drawerScore}</p>`;
  }
});

// Game end socket listener
socket.on('endGame', async ({ stats }) => {
  let players = Object.keys(stats).filter((val) => val.length === 20);
  players = players.sort((id1, id2) => stats[id2].score - stats[id1].score);

  clearInterval(timerID);
  document.querySelector('#clock').textContent = 0;
  document.querySelector('#game-screen').remove();

  let scoreTable = document.querySelector('#final-scoreboard-table > tbody');
  scoreTable.innerHTML = '';
  for(i=0; i < players.length; i++){
    if(i == 0){
      scoreTable.innerHTML += 
      `<tr class="table-success">
        <td>${stats[players[i]].name}</td>
        <td>${stats[players[i]].score}</td>
      </tr>`;
    } else if(i == players.length-1) {
      scoreTable.innerHTML += 
      `<tr class="table-danger">
        <td>${stats[players[i]].name}</td>
        <td>${stats[players[i]].score}</td>
      </tr>`;
    } else if (i == 1) {
      scoreTable.innerHTML += 
      `<tr class="table-secondary">
        <td>${stats[players[i]].name}</td>
        <td>${stats[players[i]].score}</td>
      </tr>`;
    } else {
      scoreTable.innerHTML += 
      `<tr>
        <td>${stats[players[i]].name}</td>
        <td>${stats[players[i]].score}</td>
      </tr>`;
    }
  }

  document.querySelector('#game-end-screen').classList.remove('d-none');
  document.querySelector('#game-end-screen').classList.add('d-flex');
});


/************************************************
***Video Section--------------------
*************************************************/
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  }).catch((err) => {
    console.log(err);
    toastTopAlert(
      "CAMERA ACCESS :(",
      "You have to give CAMERA Access to play this game.",
      "alert-danger"
    );
    document.querySelector('#camera-alert').classList.remove('d-none');
    if(joinRoomBtnL){
      joinRoomBtnL.setAttribute('disabled', true);
    }
    if(createRoomBtnL){
      createRoomBtnL.setAttribute('disabled', true);
    }
  });
  console.log('Camera Access Given');
}

const peers = {};
let myVideoStream;
const videoGrid = document.querySelector('#video-grid');
// Function
function videoReadyFromUser(){  
  videoGrid.innerHTML = '';
  const myPeer = new Peer(my.id, {
    host: "dumb-io-peerjs.herokuapp.com",
    port: "9000",
    secure: true, 
  })

  const myVideo = document.createElement("video");
  myVideo.classList.add('h-full');
  myVideo.classList.add('w-full');
  myVideo.classList.add('player-video');
  myVideo.classList.add('d-none');
  myVideo.style.objectFit = 'cover';
  myVideo.setAttribute("id", `video-stream-${my.id}`);
  myVideo.muted = true;

  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      myVideoStream = stream;
      addVideoStream(myVideo, stream);

      myPeer.on('call', call => {
        call.answer(stream)
      });

      socket.emit('getPlayerPeers');      
      socket.on('getPlayerPeers', (players) => {
        for(i=0; i<players.length; i++){
          if(players[i].id != my.id){
            const call = myPeer.call(players[i].id, stream);
            // Video element Creation
            const eachPlayerVideo = document.createElement("video");
            eachPlayerVideo.classList.add('h-full');
            eachPlayerVideo.classList.add('w-full');
            eachPlayerVideo.classList.add('player-video');
            eachPlayerVideo.classList.add('d-none');
            eachPlayerVideo.style.objectFit = 'cover';
            eachPlayerVideo.setAttribute("id", `video-stream-${players[i].id}`);
            eachPlayerVideo.muted = true;
            call.on('stream', userVideoStream => {
              addVideoStream(eachPlayerVideo, userVideoStream)
            });
            peers[players[i].id] = call;
          }
        }
        console.log('All Videos Addeddddddd');
        socket.emit('getCurrentDrawer');
      });
    })
  }    
}

socket.on('getCurrentDrawer', (currentDrawer) => {
  //Video Choosing
  document.querySelectorAll('.player-video').forEach((video) => {
    console.log(video);
    if(!video.classList.contains('d-none'))
      video.classList.add('d-none');
  });
  console.log(`#video-stream-${currentDrawer}`);

  setTimeout(() => {
    if(document.querySelector(`#video-stream-${currentDrawer}`)){
      console.log('current drawer er video dekhiiiiiiiiiiiiiii')
      document.querySelector(`#video-stream-${currentDrawer}`).classList.remove('d-none');
      document.querySelector(`#video-stream-${currentDrawer}`).play();
    }
  }, 3000);          
});

function addVideoStream(video, stream) {
  video.srcObject = stream;  
  videoGrid.append(video);
};

document.querySelector('#video-tool-btn').addEventListener('click', function () {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    this.classList.add('bg-danger');
    this.innerHTML = `<i class="bx bx-video-off bx-md"></i>`
  } else {
    myVideoStream.getVideoTracks()[0].enabled = true;
    this.classList.remove('bg-danger');
    this.innerHTML = `<i class="bx bxs-video bx-md"></i>`
  }
});
/************************************************
***Alert Section--------------------
*************************************************/

// Toasts Top alert
function toastTopAlert(title, content, alertType) {
  halfmoon.initStickyAlert({
    content: content,
    title: title,
    alertType: alertType,
    fillType: "filled-lm",
    timeShown: 10000
  });
}