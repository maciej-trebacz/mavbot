import { WhereFilterOp, FieldValue, QueryDocumentSnapshot, QuerySnapshot } from '@google-cloud/firestore';
import { Injectable } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import admin from 'firebase-admin';
const serviceAccount = require("../../firebase-admin.json");

export const testDb: any = [
  {field1: 'value1'},
  {field1: 'value2', field2: 2}
];
export interface TestRow {
  field1: string;
  field2: number;
}

let initialized = false;

@Injectable()
export class DbService {
  private db: admin.firestore.Firestore;

  constructor(private configService: ConfigService) {
    if (this.db) {
      console.error("DbService: Already initialized!")
      process.exit();
    }

    if (!initialized) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
    }

    this.db = admin.firestore();
  }

  initialized(): boolean {
    return !!this.db;
  }

  async initTestDb() {
    const batch = this.db.batch();
    const col = this.db.collection("test");
    testDb.forEach(row => {
      const docRef = col.doc();
      batch.set(docRef, Object.assign({}, row));
      row._id = docRef.id;
    });
    await batch.commit();
  }

  async deleteTestDb() {
    const docs = await this.db.collection("test").get();
    docs.forEach(async doc => {
      await doc.ref.delete();
    });
  }

  async fetchAll(collection: string): Promise<unknown[] | null> {
    const col = this.db.collection(collection);
    const snapshot = await col.get();
    return snapshot.docs.map(doc => ({_id: doc.id, ...doc.data()}));
  }

  async fetch(path: string): Promise<unknown | null> {
    const ref = this.db.doc(path);
    const doc = await ref.get();
    if (!doc.exists) return null;
    else return doc.data();
  }

  subscribe(path: string, listener: (snapshot: QueryDocumentSnapshot) => void) {
    const ref = this.db.doc(path);
    return ref.onSnapshot(listener)
  }

  async insert(collection: string, obj: unknown): Promise<string> {
    const col = this.db.collection(collection);
    const ref = await col.add(obj);
    return ref.id;
  }

  private getQuery(collection: string, query: string) {
    const col = this.db.collection(collection);
    const [field, operator] = query.split(" ");
    const value = query.split(" ").slice(2).join(" ");
    return col.where(field, operator as WhereFilterOp, value);
  }

  async find(collection: string, query: string): Promise<any[] | null> {
    const q = this.getQuery(collection, query);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({_id: doc.id, ...doc.data()}));
  }

  subscribeCollection(collection: string, listener: (snapshot: QuerySnapshot) => void) {
    const col = this.db.collection(collection);
    return col.onSnapshot(listener)
  }

  async increment(path: string, field: string, num: number): Promise<void> {
    const doc = this.db.doc(path);
    await doc.update({[field]: FieldValue.increment(num)});
  }

  async set(path: string, obj: unknown): Promise<void> {
    const doc = this.db.doc(path);
    await doc.set(obj);
  }

  async update(path: string, obj: unknown): Promise<void> {
    const doc = this.db.doc(path);
    await doc.update(obj);
  }
  
  async delete(path: string): Promise<void> {
    const doc = this.db.doc(path);
    await doc.delete();
  }
}
