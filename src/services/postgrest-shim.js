/**
 * Shim para @supabase/postgrest-js que permite que la aplicación cargue 
 * cuando la dependencia original no está disponible
 */

class PostgrestFilterBuilder {
  constructor() {
    this.url = '';
    this.headers = {};
    this.schema = '';
    this.method = '';
  }

  eq() { return this; }
  neq() { return this; }
  gt() { return this; }
  gte() { return this; }
  lt() { return this; }
  lte() { return this; }
  like() { return this; }
  ilike() { return this; }
  is() { return this; }
  in() { return this; }
  contains() { return this; }
  containedBy() { return this; }
  range() { return this; }
  overlaps() { return this; }
  textSearch() { return this; }
  match() { return this; }
  not() { return this; }
  or() { return this; }
  filter() { return this; }

  order() { return this; }
  limit() { return this; }
  offset() { return this; }
  select() { return this; }
  single() { return this; }
  maybeSingle() { return this; }

  then(callback) {
    console.warn('Using PostgrestShim - No real data will be fetched');
    return Promise.resolve({
      data: [],
      error: null,
      count: 0,
      status: 200,
      statusText: 'OK'
    }).then(callback);
  }

  catch(callback) {
    return Promise.resolve({
      data: [],
      error: null,
      count: 0,
      status: 200,
      statusText: 'OK'
    }).catch(callback);
  }
}

class PostgrestQueryBuilder extends PostgrestFilterBuilder {
  constructor() {
    super();
  }
}

class PostgrestBuilder {
  constructor() {
    this.url = '';
    this.headers = {};
    this.schema = '';
  }

  select() {
    return new PostgrestFilterBuilder();
  }

  insert() {
    return new PostgrestFilterBuilder();
  }

  upsert() {
    return new PostgrestFilterBuilder();
  }

  update() {
    return new PostgrestFilterBuilder();
  }

  delete() {
    return new PostgrestFilterBuilder();
  }

  rpc() {
    return new PostgrestFilterBuilder();
  }
}

export {
  PostgrestBuilder,
  PostgrestQueryBuilder,
  PostgrestFilterBuilder
}; 