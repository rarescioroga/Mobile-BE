import dataStore from 'nedb-promise';

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

export class VacationStore {
  constructor({ filename, autoload }) {
    this.store = dataStore({ filename, autoload });
  }

  async find(props) {
    return this.store.find(props);
  }

  async findOne(props) {
    return this.store.findOne(props);
  }

  async insert(vacation) {
    const { title, location, startDate, endDate } = vacation;
    if (!title) { // validation
      throw new Error('Missing title property')
    }
    if (!location) { // validation
      throw new Error('Missing location property')
    }
    if (!startDate) { // validation
      throw new Error('Missing startDate property')
    }
    if (!endDate) { // validation
      throw new Error('Missing endDate property')
    }

    const url = pictureUrls[Math.floor(Math.random() * pictureUrls.length)];

    return this.store.insert({ ...vacation, imageUrl: url });
  };

  async update(props, note) {
    return this.store.update(props, note);
  }

  async remove(props) {
    return this.store.remove(props);
  }
}

export default new VacationStore({ filename: './db/vacations.json', autoload: true });
