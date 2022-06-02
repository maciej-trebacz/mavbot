import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from "@nestjs/config";
import { DbService, TestRow, testDb } from './db.service';
import { QueryDocumentSnapshot } from '@google-cloud/firestore';

describe('DbService', () => {
  let dbService: DbService;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [DbService],
    }).compile();

    jest.setTimeout(10000);

    dbService = app.get<DbService>(DbService);
    await dbService.initTestDb();
  });

  afterAll(async () => {
    jest.setTimeout(5000);
    await dbService.deleteTestDb();
  });

  describe('root', () => {
    it('should be initialized properly', () => {
      expect(dbService.initialized()).toBe(true);
    });

    it('should be able to fetch all documents from a collection', async () => {
      const docs = await dbService.fetchAll('test') as TestRow[];
      expect(docs.length).toBe(2);
    });

    it('should be able to fetch a single document', async () => {
      const doc = await dbService.fetch('test/' + testDb[0]._id) as TestRow;
      expect(doc.field1).toBe('value1');
    });

    it('should be able to insert a single document', async () => {
      const id = await dbService.insert('test', {field1: 'new'});
      const doc = await dbService.fetch('test/' + id) as TestRow;
      expect(doc.field1).toBe('new');
    });

    it('should be able to find documents with a query', async () => {
      const docs = await dbService.find('test', 'field1 == value2') as TestRow[];
      console.log("DOCS", docs);
      expect(docs.length).toBe(1);
      expect(docs[0].field2).toBe(2);
    });

    it('should be able to increment a value in a document', async () => {
      await dbService.increment('test/' + testDb[1]._id, 'field2', 1);
      const doc = await dbService.fetch('test/' + testDb[1]._id) as TestRow;
      expect(doc.field2).toBe(3);
    });

    it('should be able to set a document', async () => {
      const id = await dbService.set('test/set_test', {field1: 'set'});
      const doc = await dbService.fetch('test/set_test') as TestRow;
      expect(doc.field1).toBe('set');
    });

    it('should be able to update a document', async () => {
      await dbService.update('test/' + testDb[1]._id, {field2: 4});
      const doc = await dbService.fetch('test/' + testDb[1]._id) as TestRow;
      expect(doc.field2).toBe(4);
    });

    it('should be able to delete a document', async () => {
      await dbService.delete('test/' + testDb[1]._id);
      const doc = await dbService.fetch('test/' + testDb[1]._id) as TestRow;
      expect(doc).toBeNull();
    });

    it('should be able to subscribe to document changes', async () => {
      const listener = jest.fn((snapshot: QueryDocumentSnapshot) => {
        const data = snapshot.data() as TestRow;
        expect(data.field2).toBe(5);
      })
      const unsubscribe = dbService.subscribe('test/' + testDb[0]._id, listener);
      await dbService.update('test/' + testDb[0]._id, {field2: 5});
      await new Promise((r) => setTimeout(r, 1000));
      unsubscribe();
      expect(listener).toBeCalled();
    });    
  });
});
