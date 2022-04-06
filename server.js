const socket = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');

const getUserName = (users) => {
  const userByMaxNumber = Object.values(users).sort().pop();
  const newUserNumber = userByMaxNumber
    ? Number(userByMaxNumber.replace('user', '')) + 1
    : 1;
  return `user${newUserNumber}`;
};

const addUser = (state, userId) => {
  return {
    users: { ...state.users, [userId]: getUserName(state.users) },
    countVisitors: state.countVisitors + 1,
  };
};

const deleteUser = (state, userId) => {
  const newUsers = { ...state.users };
  delete newUsers[userId];
  return {
    users: newUsers,
    countVisitors: state.countVisitors - 1,
  };
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    const indexPath = path.join(__dirname, 'index.html');

    const readStream = fs.createReadStream(indexPath);

    readStream.pipe(res);
  } else {
    res.statusCode = 405;
    res.end();
  }
});

const io = socket(server);

let state = {
  users: {},
  countVisitors: 0,
};

io.on('connection', (client) => {
  state = addUser(state, client.id);

  const connectMessage = `${state.users[client.id]} has entered the chat.`;

  client.emit('client_connect', {
    msg: connectMessage,
    countVisitors: state.countVisitors,
  });

  client.broadcast.emit('client_connect', {
    msg: connectMessage,
    countVisitors: state.countVisitors,
  });

  client.on('client_msg', (data) => {
    const message = { msg: `${state.users[client.id]}: ${data.msg}` };

    client.emit('server_msg', message);
    client.broadcast.emit('server_msg', message);
  });

  client.on('disconnect', () => {
    const disconnectMessage = `${state.users[client.id]} has left the chat.`;

    state = deleteUser(state, client.id);

    client.broadcast.emit('client_disconnect', {
      msg: disconnectMessage,
      countVisitors: state.countVisitors,
    });
  });
});

server.listen(3000, 'localhost');
