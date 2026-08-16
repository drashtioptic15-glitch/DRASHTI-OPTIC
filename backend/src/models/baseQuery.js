export class Query {
  constructor(executor) {
    this._executor = executor;
    this._populateFields = [];
    this._sortObj = null;
    this._limitVal = undefined;
    this._skipVal = 0;
    this._selectFields = null;
  }

  populate(...fields) {
    for (const f of fields) {
      if (!f) continue;
      if (typeof f === 'string') {
        this._populateFields.push(...f.split(' ').filter(Boolean));
      } else if (Array.isArray(f)) {
        this._populateFields.push(...f.filter(Boolean));
      }
    }
    return this;
  }

  sort(sortObj) {
    this._sortObj = sortObj;
    return this;
  }

  limit(n) {
    this._limitVal = Number(n);
    return this;
  }

  skip(n) {
    this._skipVal = Number(n);
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  async exec() {
    return await this._executor({
      populate: this._populateFields,
      sort: this._sortObj,
      limit: this._limitVal,
      skip: this._skipVal,
      select: this._selectFields,
    });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}
