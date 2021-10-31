import dataStore from 'nedb-promise';


export class CarStore {
  constructor({ filename, autoload }) {
    this.store = dataStore({ filename, autoload });
  }

  async find(props) {
    return this.store.find(props);
  }

  async findOne(props) {
    return this.store.findOne(props);
  }

  async insert(car) {
    const { brand, model, firstRegisterDate } = car;
    if (!brand) { // validation
      throw new Error('Missing brand property')
    }
    if (!firstRegisterDate) { // validation
      throw new Error('Missing firstRegistrationDate property')
    }
    if (!model) { // validation
      throw new Error('Missing model property')
    }

    return this.store.insert(car);
  };

  async update(props, note) {
    return this.store.update(props, note);
  }

  async remove(props) {
    return this.store.remove(props);
  }
}

export default new CarStore({ filename: './db/cars.json', autoload: true });
