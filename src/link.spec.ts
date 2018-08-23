import {
  deserialize,
  ErrLinkMetaMissing,
  ErrUnknownClientId,
  ErrUnknownLinkVersion,
  Link
} from "./link";
import { LinkBuilder } from "./link_builder";
import {
  Link as PbLink,
  LinkMeta as PbLinkMeta,
  Process as PbProcess
} from "./proto/chainscript_pb";

/**
 * Create a valid link.
 */
function createLink(): Link {
  return new LinkBuilder("test_process", "test_map").build();
}

describe("link", () => {
  describe("process", () => {
    it("throws if meta is missing", () => {
      const link = new Link(new PbLink());
      expect(() => link.process()).toThrowError("link meta is missing");
    });

    it("throws if process is missing", () => {
      const pbLink = new PbLink();
      pbLink.setMeta(new PbLinkMeta());

      const link = new Link(pbLink);
      expect(() => link.process()).toThrowError("link process is missing");
    });
  });

  describe("map id", () => {
    it("throws if meta is missing", () => {
      const link = new Link(new PbLink());
      expect(() => link.mapId()).toThrowError("link meta is missing");
    });
  });

  it("throws when meta is missing", () => {
    const link = new Link(new PbLink());

    expect(() => link.action()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.clientId()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.mapId()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.prevLinkHash()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.priority()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.process()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.step()).toThrowError(ErrLinkMetaMissing);
    expect(() => link.tags()).toThrowError(ErrLinkMetaMissing);
  });

  describe("data", () => {
    const customData = { name: "Sponge", surname: "Bob" };

    it("rejects missing meta", () => {
      const link = new Link(new PbLink());
      expect(() => link.data()).toThrowError(ErrLinkMetaMissing);
      expect(() => link.setData(customData)).toThrowError(ErrLinkMetaMissing);
    });

    it("rejects incompatible client id", () => {
      const meta = new PbLinkMeta();
      meta.setClientId("github.com/some-random-guy/with-custom-impl");

      const pbLink = new PbLink();
      pbLink.setMeta(meta);

      const link = new Link(pbLink);
      expect(() => link.data()).toThrowError(ErrUnknownClientId);
      expect(() => link.setData(customData)).toThrowError(ErrUnknownClientId);
    });

    it("rejects unknown version", () => {
      const meta = new PbLinkMeta();
      meta.setClientId("github.com/stratumn/go-chainscript");

      const pbLink = new PbLink();
      pbLink.setData("42");
      pbLink.setMeta(meta);
      pbLink.setVersion("0.42.0");

      const link = new Link(pbLink);
      expect(() => link.data()).toThrowError(ErrUnknownLinkVersion);
      expect(() => link.setData(customData)).toThrowError(
        ErrUnknownLinkVersion
      );
    });

    it("sets custom object", () => {
      const link = createLink();
      link.setData(customData);

      const data = link.data();
      expect(data).toEqual(customData);
    });

    it("sets built-in type", () => {
      const link = createLink();
      link.setData(42);

      const data = link.data();
      expect(data).toEqual(42);
    });
  });

  describe("metadata", () => {
    const customMetadata = { name: "Batman", age: 42 };

    it("rejects missing meta", () => {
      const link = new Link(new PbLink());
      expect(() => link.metadata()).toThrowError(ErrLinkMetaMissing);
      expect(() => link.setMetadata(customMetadata)).toThrowError(
        ErrLinkMetaMissing
      );
    });

    it("rejects incompatible client id", () => {
      const meta = new PbLinkMeta();
      meta.setClientId("github.com/some-random-guy/with-custom-impl");

      const pbLink = new PbLink();
      pbLink.setMeta(meta);

      const link = new Link(pbLink);
      expect(() => link.metadata()).toThrowError(ErrUnknownClientId);
      expect(() => link.setMetadata(customMetadata)).toThrowError(
        ErrUnknownClientId
      );
    });

    it("rejects unknown version", () => {
      const meta = new PbLinkMeta();
      meta.setClientId("github.com/stratumn/go-chainscript");
      meta.setData("42");

      const pbLink = new PbLink();
      pbLink.setMeta(meta);
      pbLink.setVersion("0.42.0");

      const link = new Link(pbLink);
      expect(() => link.metadata()).toThrowError(ErrUnknownLinkVersion);
      expect(() => link.setMetadata(customMetadata)).toThrowError(
        ErrUnknownLinkVersion
      );
    });

    it("sets custom object", () => {
      const link = createLink();
      link.setMetadata(customMetadata);

      const metadata = link.metadata();
      expect(metadata).toEqual(customMetadata);
    });

    it("sets built-in type", () => {
      const link = createLink();
      link.setMetadata(42);

      const metadata = link.metadata();
      expect(metadata).toEqual(42);
    });
  });

  describe("hash", () => {
    it("rejects unknown version", () => {
      const pbLink = new PbLink();
      pbLink.setVersion("0.42.0");

      const link = new Link(pbLink);
      expect(() => link.hash()).toThrowError(ErrUnknownLinkVersion);
    });

    it("hashes link", () => {
      const link = createLink();

      const h1 = link.hash();
      expect(h1).toHaveLength(32);

      link.setData(42);
      const h2 = link.hash();
      expect(h2).toHaveLength(32);
      expect(h2).not.toEqual(h1);
    });
  });

  describe("segmentify", () => {
    it("rejects unknown version", () => {
      const pbLink = new PbLink();
      pbLink.setVersion("0.42.0");

      const link = new Link(pbLink);
      expect(() => link.segmentify()).toThrowError(ErrUnknownLinkVersion);
    });

    it("hashes link in segment meta", () => {
      const link = createLink();
      const segment = link.segmentify();

      expect(segment.link()).toEqual(link);
      expect(segment.linkHash()).toEqual(link.hash());
    });
  });

  describe("serialize", () => {
    it("with data and metadata", () => {
      const link = new LinkBuilder("p1", "m1")
        .withAction("init")
        .withTags(["tag1", "tag2"])
        .withData({ name: "batman", age: 42 })
        .withMetadata({ updatedCount: 3 })
        .build();

      const serialized = link.serialize();
      expect(serialized.length).toBeGreaterThan(5);

      const link2 = deserialize(serialized);
      expect(link2.action()).toEqual("init");
      expect(link2.clientId()).toEqual(link.clientId());
      expect(link2.data().name).toEqual("batman");
      expect(link2.data().age).toEqual(42);
      expect(link2.hash()).toEqual(link.hash());
      expect(link2.mapId()).toEqual("m1");
      expect(link2.metadata().updatedCount).toEqual(3);
      expect(link2.process().name).toEqual("p1");
      expect(link2.tags()).toEqual(["tag1", "tag2"]);
      expect(link2.version()).toEqual(link.version());
    });
  });
});
