import { LocalFileStore } from "infrastructure/file-store";
import { DyanmoDBGroupStore } from "infrastructure/group-store/dynamodb-group-store";
import { createGroupsEntityManager } from "infrastructure/group-store/groups.entity";
import { resetDB, getLocalDocumentClient } from "infrastructure/utils";
import { exampleData, testGroups } from "topics/group/test-groups";

const testPath = `${__dirname}/../../../test-disk-store/unit`;
const dynamodbClient = getLocalDocumentClient();

describe("test groups stores", () => {
  const dyanmodbGroupStore = new DyanmoDBGroupStore(
    new LocalFileStore("groups-data", testPath),
    createGroupsEntityManager({
      documentClient: dynamodbClient,
    })
  );

  beforeEach(async () => {
    await resetDB(dynamodbClient);
  });

  it("Should save multiple groups and search by name", async () => {
    await dyanmodbGroupStore.save(testGroups.group1_0);
    await dyanmodbGroupStore.save(testGroups.group1_1);
    await dyanmodbGroupStore.save(testGroups.group2_0);

    const groups = await dyanmodbGroupStore.search({
      groupName: testGroups.group1_0.name,
    });
    expect(groups).toHaveLength(2);
    expect(groups).toContainGroup(testGroups.group1_0);
    expect(groups).toContainGroup(testGroups.group1_1);
  });

  it("Should generate multiple groups and search by name and latest", async () => {
    await dyanmodbGroupStore.save(testGroups.group1_0);
    await dyanmodbGroupStore.save(testGroups.group1_1);
    await dyanmodbGroupStore.save(testGroups.group2_0);

    const latest1 = await dyanmodbGroupStore.search({
      groupName: testGroups.group1_0.name,
      latest: true,
    });
    expect(latest1[0]).toBeSameGroup(testGroups.group1_1);

    const latest2 = await dyanmodbGroupStore.search({
      groupName: testGroups.group2_0.name,
      latest: true,
    });
    expect(latest2[0]).toBeSameGroup(testGroups.group2_0);
  });

  it("Should generate multiple groups and get latests", async () => {
    await dyanmodbGroupStore.save(testGroups.group1_0);
    await dyanmodbGroupStore.save(testGroups.group1_1);
    await dyanmodbGroupStore.save(testGroups.group2_0);

    const latests = await dyanmodbGroupStore.latests();
    expect(Object.keys(latests)).toHaveLength(2);
    expect(latests[testGroups.group1_0.name]).toBeSameGroup(
      testGroups.group1_1
    );
    expect(latests[testGroups.group2_0.name]).toBeSameGroup(
      testGroups.group2_0
    );
    expect(await latests[testGroups.group1_0.name].data()).toEqual(exampleData);
  });

  it("Should throw error when retrieving latest from empty store", async () => {
    await expect(async () => {
      await dyanmodbGroupStore.latest(testGroups.group1_0.name);
    }).rejects.toThrow();
  });

  it("Should generate a group and retrieve data from store", async () => {
    await dyanmodbGroupStore.save(testGroups.group1_0);
    const group = await dyanmodbGroupStore.latest(testGroups.group1_0.name);
    expect(await group.data()).toEqual(exampleData);
  });
});
