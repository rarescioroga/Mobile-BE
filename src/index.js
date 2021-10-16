const Koa = require('koa');
const app = new Koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyparser = require('koa-bodyparser');

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.use(bodyparser());
app.use(cors());
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

app.use(async (ctx, next) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  await next();
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.body = { issue: [{ error: err.message || 'Unexpected error' }] };
    ctx.response.status = 500;
  }
});

class Vacation {
  constructor({ id, title, location, isBooked, nrPeople,  startDate, endDate, description, imageUrl }) {
    this.id = id;
    this.title = title;
    this.location = location;
    this.isBooked = isBooked;
    this.nrPeople = nrPeople;
    this.startDate = startDate;
    this.endDate = endDate;
    this.description = description;
    this.imageUrl = imageUrl;
  }
}

const vacations = [];
const locations = [
  'Paris, France',
  'Rome, Italy',
  'Bucharest, Romania',
  'Budapest, Hungary',
  'Berlin, Germany',
  'Vienna, Austria',
  'New York USA',
  'Los Angeles, USA',
  'London, England',
  'Cluj-Napoca, Romania',
  'Prague, Czech Republic',
]
const pictureUrls = [
  'https://cdn.pixabay.com/photo/2018/04/25/09/26/eiffel-tower-3349075_1280.jpg', //Paris
  'https://cdn.pixabay.com/photo/2019/10/06/08/57/architecture-4529605_1280.jpg', //Rome
  'https://cdn.pixabay.com/photo/2015/09/01/18/16/peoples-house-917369_1280.jpg', //Bucharest
  'https://cdn.pixabay.com/photo/2016/06/06/23/49/parliament-1440679_1280.jpg', //Budapest
  'https://cdn.pixabay.com/photo/2018/08/08/18/49/church-3592874_1280.jpg', //Berlin
  'https://cdn.pixabay.com/photo/2019/08/13/17/17/building-4403839_1280.jpg', //Vienna
  'https://cdn.pixabay.com/photo/2015/03/11/12/31/buildings-668616_1280.jpg', //New York
  'https://cdn.pixabay.com/photo/2015/11/07/12/00/city-1031706_1280.jpg', //Los Angeles
  'https://cdn.pixabay.com/photo/2014/11/13/23/34/palace-530055_1280.jpg', //London
  'https://cdn.pixabay.com/photo/2014/07/12/20/02/cluj-napoca-391379_1280.jpg', //Cluj
  'https://cdn.pixabay.com/photo/2017/12/10/17/40/prague-3010407_1280.jpg' //Prague
]

for (let i = 0; i < 4; i++) {
  const index = getRandomInt(0, locations.length - 1);
  vacations.push(new Vacation({
    id: `${i}`,
    title: `Vacation title ${i}`,
    location: locations[index],
    isBooked: false,
    startDate: new Date(Date.now() + i),
    endDate: new Date(Date.now() + i + 7),
    description: `Vacation description ${i}`,
    nrPeople: getRandomInt(1, 4),
    imageUrl: pictureUrls[index],
  }));
}

let lastUpdated = vacations[vacations.length - 1].startDate;
let lastId = vacations[vacations.length - 1].id;

const broadcast = data =>
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

const router = new Router();

router.get('/vacation', ctx => {
  const ifModifiedSince = ctx.request.get('If-Modif ied-Since');

  if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= lastUpdated.getTime() - lastUpdated.getMilliseconds()) {
    ctx.response.status = 304; // NOT MODIFIED
    return;
  }

  ctx.response.set('Last-Modified', lastUpdated.toUTCString());
  ctx.response.body = vacations;
  ctx.response.status = 200;
});

router.get('/vacation/:id', async (ctx) => {
  const vacationId = ctx.params.id;
  console.log('vacationId', vacationId);
  const vacation = vacations.find(item => vacationId === item.id);

  if (vacation) {
    ctx.response.body = vacation;
    ctx.response.status = 200; // ok
  } else {
    ctx.response.body = { issue: [{ warning: `item with id ${vacationId} not found` }] };
    ctx.response.status = 404; // NOT FOUND (if you know the resource was deleted, then return 410 GONE)
  }
});

const createVacation = async (ctx) => {
  const vacation = ctx.request.body;

  //id, title, location, isBooked, nrPeople,  startDate, endDate, description, imageUrl

  if (!vacation.title || !vacation.location || !vacation.startDate || !vacation.endDate) { // validation
    ctx.response.body = { issue: [{ error: 'Vacation does not have required fields' }] };
    ctx.response.status = 400; //  BAD REQUEST
    return;
  }

  vacation.id = `${parseInt(lastId) + 1}`;
  lastId = vacation.id;
  vacation.imageUrl = pictureUrls[getRandomInt(0, pictureUrls.length)]

  vacations.push(vacation);
  ctx.response.body = vacation;
  ctx.response.status = 201; // CREATED
};

router.post('/vacation', async (ctx) => {
  await createVacation(ctx);
});

router.put('/vacation/:id', async (ctx) => {
  const id = ctx.params.id;
  const vacation = ctx.request.body;
  console.log(vacation);
  const itemId = vacation.id;

  if (itemId && id !== vacation.id) {
    ctx.response.body = { issue: [{ error: `Param id and body id should be the same` }] };
    ctx.response.status = 400; // BAD REQUEST
    return;
  }

  if (!itemId) {
    await createVacation(ctx);
    return;
  }

  const index = vacations.findIndex(item => item.id === id);

  if (index === -1) {
    ctx.response.body = { issue: [{ error: `vacation with id ${id} not found` }] };
    ctx.response.status = 400; // BAD REQUEST
    return;
  }

  vacations[index] = vacation;
  lastUpdated = new Date();
  ctx.response.body = vacation;
  ctx.response.status = 200; // OK
  broadcast({ event: 'updated', payload: { vacation } });
});

router.del('/vacation/:id', ctx => {
  const id = ctx.params.id;
  const index = vacations.findIndex(item => id === item.id);

  if (index !== -1) {
    const vacation = vacations[index];
    vacations.splice(index, 1);
    lastUpdated = new Date();
    broadcast({ event: 'deleted', payload: { vacation } });
  }

  ctx.response.status = 204; // no content
});

setInterval(() => {
  lastUpdated = new Date();
  lastId = `${parseInt(lastId) + 1}`;

  const index = getRandomInt(0, locations.length - 1);

  const vacation = new Vacation({
    id: `${lastId}`,
    title: `Vacation title ${lastId}`,
    location: locations[index],
    isBooked: false,
    startDate: new Date(Date.now() + lastId),
    endDate: new Date(Date.now() + lastId + 7),
    description: `Vacation description ${lastId}`,
    nrPeople: getRandomInt(1, 4),
    imageUrl: pictureUrls[index],
  });

  vacations.push(vacation);
  console.log(`${vacation.title} ${vacation.location}`);

  broadcast({ event: 'created', payload: { vacation } });
}, 10000);

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3005);
