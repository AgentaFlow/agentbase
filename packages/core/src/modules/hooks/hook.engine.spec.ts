import { Test, TestingModule } from "@nestjs/testing";
import { HookEngine, HookContext } from "./hook.engine";

describe("HookEngine", () => {
  let engine: HookEngine;

  const ctx: HookContext = {
    applicationId: "app-1",
    userId: "user-1",
    pluginId: "plugin-a",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HookEngine],
    }).compile();

    engine = module.get<HookEngine>(HookEngine);
  });

  it("should be defined", () => {
    expect(engine).toBeDefined();
  });

  // ─── Actions ─────────────────────────────────────────────
  describe("registerAction / doAction", () => {
    it("should register and execute an action", async () => {
      const callback = jest.fn();
      engine.registerAction("test:action", "plugin-a", callback);

      await engine.doAction("test:action", ctx, "arg1", "arg2");

      expect(callback).toHaveBeenCalledWith(ctx, "arg1", "arg2");
    });

    it("should execute actions in priority order", async () => {
      const order: number[] = [];
      engine.registerAction(
        "ordered",
        "p1",
        async () => {
          order.push(1);
        },
        20,
      );
      engine.registerAction(
        "ordered",
        "p2",
        async () => {
          order.push(2);
        },
        5,
      );
      engine.registerAction(
        "ordered",
        "p3",
        async () => {
          order.push(3);
        },
        10,
      );

      await engine.doAction("ordered", ctx);

      expect(order).toEqual([2, 3, 1]);
    });

    it("should not throw when no actions registered for hook", async () => {
      await expect(
        engine.doAction("nonexistent", ctx),
      ).resolves.toBeUndefined();
    });

    it("should catch and log errors from action callbacks", async () => {
      const badCallback = jest.fn().mockRejectedValue(new Error("boom"));
      const goodCallback = jest.fn();

      engine.registerAction("failing", "p1", badCallback, 1);
      engine.registerAction("failing", "p2", goodCallback, 2);

      await engine.doAction("failing", ctx);

      // Both should have been called, error shouldn't prevent next
      expect(badCallback).toHaveBeenCalled();
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  // ─── Filters ─────────────────────────────────────────────
  describe("registerFilter / applyFilter", () => {
    it("should register and apply a filter", async () => {
      engine.registerFilter(
        "test:filter",
        "plugin-a",
        async (_ctx, value: string) => {
          return value.toUpperCase();
        },
      );

      const result = await engine.applyFilter("test:filter", ctx, "hello");

      expect(result).toBe("HELLO");
    });

    it("should chain filters in priority order", async () => {
      engine.registerFilter(
        "chain",
        "p1",
        async (_ctx, val: number) => val + 10,
        20,
      );
      engine.registerFilter(
        "chain",
        "p2",
        async (_ctx, val: number) => val * 2,
        5,
      );
      engine.registerFilter(
        "chain",
        "p3",
        async (_ctx, val: number) => val + 3,
        10,
      );

      // Priority order: p2(5) → p3(10) → p1(20)
      // Start: 1 → *2=2 → +3=5 → +10=15
      const result = await engine.applyFilter("chain", ctx, 1);
      expect(result).toBe(15);
    });

    it("should return original value when no filters registered", async () => {
      const result = await engine.applyFilter("none", ctx, "original");
      expect(result).toBe("original");
    });

    it("should continue chain even if a filter throws", async () => {
      engine.registerFilter(
        "err",
        "p1",
        () => {
          throw new Error("oops");
        },
        1,
      );
      engine.registerFilter(
        "err",
        "p2",
        async (_ctx, val: string) => val + "-ok",
        2,
      );

      const result = await engine.applyFilter("err", ctx, "start");
      // After p1 error, value remains 'start', then p2 appends '-ok'
      expect(result).toBe("start-ok");
    });
  });

  // ─── removePluginHooks ───────────────────────────────────
  describe("removePluginHooks", () => {
    it("should remove all hooks for a specific plugin", async () => {
      const cbA = jest.fn();
      const cbB = jest.fn();
      engine.registerAction("shared", "plugin-a", cbA);
      engine.registerAction("shared", "plugin-b", cbB);

      engine.removePluginHooks("plugin-a");

      await engine.doAction("shared", ctx);
      expect(cbA).not.toHaveBeenCalled();
      expect(cbB).toHaveBeenCalled();
    });

    it("should remove filters for the plugin", () => {
      engine.registerFilter("f", "plugin-a", async (_ctx, v) => v);
      engine.registerFilter("f", "plugin-b", async (_ctx, v) => v);

      expect(engine.hasFilter("f")).toBe(true);
      engine.removePluginHooks("plugin-a");
      expect(engine.hasFilter("f")).toBe(true); // plugin-b still registered
    });
  });

  // ─── hasAction / hasFilter ───────────────────────────────
  describe("hasAction / hasFilter", () => {
    it("should return true when hooks exist", () => {
      engine.registerAction("a", "p1", jest.fn());
      engine.registerFilter("f", "p1", jest.fn());

      expect(engine.hasAction("a")).toBe(true);
      expect(engine.hasFilter("f")).toBe(true);
    });

    it("should return false when no hooks registered", () => {
      expect(engine.hasAction("missing")).toBe(false);
      expect(engine.hasFilter("missing")).toBe(false);
    });
  });

  // ─── getRegisteredHooks ──────────────────────────────────
  describe("getRegisteredHooks", () => {
    it("should return summary of all registered hooks", () => {
      engine.registerAction("action:one", "p1", jest.fn(), 10);
      engine.registerFilter("filter:one", "p2", jest.fn(), 5);

      const result = engine.getRegisteredHooks();

      expect(result.actions["action:one"]).toEqual([
        { pluginId: "p1", priority: 10 },
      ]);
      expect(result.filters["filter:one"]).toEqual([
        { pluginId: "p2", priority: 5 },
      ]);
    });
  });
});
