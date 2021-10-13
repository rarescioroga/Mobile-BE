const Koa = require('koa');
const app = new Koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyparser = require('koa-bodyparser');

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

class Car {
  constructor({ id, brand, model, firstRegisterDate, nrOfOwners, isRepainted, imageUrl }) {
    this.id = id;
    this.brand = brand;
    this.model = model;
    this.firstRegisterDate = firstRegisterDate;
    this.nrOfOwners = nrOfOwners;
    this.isRepainted = isRepainted;
    this.imageUrl = imageUrl;
  }
}

const cars = [];

for (let i = 0; i < 3; i++) {
  cars.push(new Car({
    id: `${i}`,
    brand: `car brand ${i}`,
    model: `car model ${i}`,
    firstRegisterDate: new Date(Date.now() + i),
    nrOfOwners: `${i}`,
    isRepainted: false,
    imageUrl: 'https://cdn.motor1.com/images/mgl/yKJwK/s1/2020-porsche-911-turbo.jpg'
  }));
}

let lastUpdated = cars[cars.length - 1].firstRegisterDate;
let lastId = cars[cars.length - 1].id;
const pageSize = 10;

const broadcast = data =>
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

const router = new Router();

router.get('/car', ctx => {
  const ifModifiedSince = ctx.request.get('If-Modif ied-Since');

  if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= lastUpdated.getTime() - lastUpdated.getMilliseconds()) {
    ctx.response.status = 304; // NOT MODIFIED
    return;
  }

  ctx.response.set('Last-Modified', lastUpdated.toUTCString());
  ctx.response.body = cars;
  ctx.response.status = 200;
});

router.get('/car/:id', async (ctx) => {
  const carId = ctx.request.params.id;
  const car = cars.find(item => carId === item.id);

  if (car) {
    ctx.response.body = car;
    ctx.response.status = 200; // ok
  } else {
    ctx.response.body = { issue: [{ warning: `item with id ${carId} not found` }] };
    ctx.response.status = 404; // NOT FOUND (if you know the resource was deleted, then return 410 GONE)
  }
});

const createCar = async (ctx) => {
  const car = ctx.request.body;

  if (!car.brand || !car.model || !car.firstRegisterDate) { // validation
    ctx.response.body = { issue: [{ error: 'Car does not have required fields' }] };
    ctx.response.status = 400; //  BAD REQUEST
    return;
  }

  car.id = `${parseInt(lastId) + 1}`;
  lastId = car.id;
  car.firstRegisterDate = new Date();
  car.nrOfOwners = 1;
  car.isRepainted = false
  cars.push(car);
  ctx.response.body = car;
  ctx.response.status = 201; // CREATED
  broadcast({ event: 'created', payload: { car } });
};

router.post('/car', async (ctx) => {
  await createCar(ctx);
});

router.put('/item/:id', async (ctx) => {
  const id = ctx.params.id;
  const car = ctx.request.body;
  const itemId = car.id;

  if (itemId && id !== item.id) {
    ctx.response.body = { issue: [{ error: `Param id and body id should be the same` }] };
    ctx.response.status = 400; // BAD REQUEST
    return;
  }

  if (!itemId) {
    await createCar(ctx);
    return;
  }

  const index = cars.findIndex(car => car.id === id);

  if (index === -1) {
    ctx.response.body = { issue: [{ error: `car with id ${id} not found` }] };
    ctx.response.status = 400; // BAD REQUEST
    return;
  }

  cars[index] = car;
  lastUpdated = new Date();
  ctx.response.body = car;
  ctx.response.status = 200; // OK
  broadcast({ event: 'updated', payload: { car } });
});

router.del('/item/:id', ctx => {
  const id = ctx.params.id;
  const index = cars.findIndex(item => id === item.id);

  if (index !== -1) {
    const car = cars[index];
    cars.splice(index, 1);
    lastUpdated = new Date();
    broadcast({ event: 'deleted', payload: { car } });
  }

  ctx.response.status = 204; // no content
});

setInterval(() => {
  lastUpdated = new Date();
  lastId = `${parseInt(lastId) + 1}`;
  const car = new Car({
    id: lastId,
    brand: `car brand ${lastId}`,
    model: `car model ${lastId}`,
    firstRegisterDate: new Date(Date.now() + lastId),
    nrOfOwners: `${lastId}`,
    isRepainted: false,
  });

  cars.push(car);
  console.log(`${car.brand} ${car.model}`);

  broadcast({ event: 'created', payload: { car } });
}, 150000);

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3005);
