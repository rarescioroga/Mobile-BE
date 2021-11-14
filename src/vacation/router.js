import Router from 'koa-router';
import vacationStore from './store';
import { broadcast } from "../utils";

export const router = new Router();

router.get('/', async (ctx) => {
  const response = ctx.response;
  const userId = ctx.state.user._id;
  response.body = await vacationStore.find({ userId });
  response.status = 200; // ok
});

router.get('/:id', async (ctx) => {
  const userId = ctx.state.user._id;
  const vacation = await vacationStore.findOne({ _id: ctx.params.id });
  const response = ctx.response;

  if (vacation) {
    if (vacation.userId === userId) {
      response.body = vacation;
      response.status = 200; // ok
    } else {
      response.status = 403; // forbidden
    }
  } else {
    response.status = 404; // not found
  }
});

const createVacation = async (ctx, vacation, response) => {
  try {
    vacation.userId = ctx.state.user._id;
    response.body = await vacationStore.insert(vacation);
    response.status = 201; // created
  } catch (err) {
    response.body = { message: err.message };
    response.status = 400; // bad request
  }
};

router.post('/', async ctx => await createVacation(ctx, ctx.request.body, ctx.response));

router.put('/:id', async (ctx) => {
  const vacation = ctx.request.body;
  const id = ctx.params.id;
  const vacationId = vacation._id;
  const response = ctx.response;

  if (vacationId && vacationId !== id) {
    response.body = { message: 'Param id and body _id should be the same' };
    response.status = 400; // bad request
    return;
  }

  if (!vacationId) {
    await createVacation(ctx, vacation, response);
    return;
  }

  const userId = ctx.state.user._id;
  vacation.userId = userId;
  const updatedCount = await vacationStore.update({ _id: id }, vacation);

  if (updatedCount === 1) {
    response.body = vacation;
    response.status = 200; // ok
  } else {
    response.body = { message: 'Resource no longer exists' };
    response.status = 405; // method not allowed
  }
});

router.del('/:id', async (ctx) => {
  const userId = ctx.state.user._id;
  const vacation = await vacationStore.findOne({ _id: ctx.params.id });

  if (vacation && userId !== vacationId.userId) {
    ctx.response.status = 403; // forbidden
  } else {
    await vacationStore.remove({ _id: ctx.params.id });
    ctx.response.status = 204; // no content
  }
});
