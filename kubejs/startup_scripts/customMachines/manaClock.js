console.info("[SOCIETY] manaClock.js loaded");

const MANA_PER_AGE = 10000;
const CLOCK_MAX_MANA = MANA_PER_AGE * 26;

global.manaClockTick = (entity) => {
  const { block, level } = entity;
  const { x, y, z } = block;
  const radius = 1;
  let mana = entity.persistentData.getInt("mana");
  let dayTime = level.dayTime();
  let morningModulo = dayTime % 24000;
  const manaClockProgTime = 1000;
  // only progress the machines once a day at 7am.
  if (
    morningModulo >= manaClockProgTime &&
    morningModulo < manaClockProgTime + artMachineTickRate
  ) {
    let scanBlock;
    let progressed = false;
    for (let pos of BlockPos.betweenClosed(
      new BlockPos(x - radius, y - radius, z - radius),
      [x + radius, y + radius, z + radius]
    )) {
      if (!level.isLoaded(pos)) continue;
      scanBlock = level.getBlock(pos);
      if (scanBlock.hasTag("society:golden_clock_advanced")) {

        // don't consume mana if the machine is not working or is finished processing.
        if (scanBlock.properties.get("working") !== "true") continue;

        // check if the mana clock has enough mana to progress the machine.
        if (mana < MANA_PER_AGE) break;
        global.handleProgress(level, scanBlock);
        mana -= MANA_PER_AGE;
        entity.persistentData.putInt("mana", mana);

        // store if the mana clock progressed any machines.
        progressed = true;

        level.spawnParticles(
          "farmlife:stinky",
          true,
          scanBlock.x,
          scanBlock.y + 1.5,
          scanBlock.z,
          0.1 * rnd(1, 4),
          0.1 * rnd(1, 4),
          0.1 * rnd(1, 4),
          5,
          0.01
        );
      }
    }

    // play a sound effect when the mana clock has progressed any machines this cycle.
    if (progressed) {
      level.server.runCommandSilent(
        `playsound botania:gaia_trap block @a ${x} ${y} ${z}`
      );
    }
  }
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:mana_clock", "cardinal")
    .soundType("copper")
    .box(1, 0, 1, 15, 16, 15)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .item((item) => {
      item.tooltip(
        Text.translatable("block.society.mana_clock.description").gray()
      );
      item.tooltip(
        Text.translatable("society.working_block_entity.need_mana").aqua()
      );
      item.tooltip(Text.translatable("tooltip.society.area", `3x3`).green());
      item.modelJson({
        parent: "society:block/kubejs/mana_clock",
      });
    })
    .model("society:block/kubejs/mana_clock")
    .blockEntity((blockInfo) => {
      blockInfo.serverTick(200, 0, (entity) => global.manaClockTick(entity)),
        blockInfo.attachCapability(
          BotaniaCapabilityBuilder.MANA.blockEntity()
            .canReceiveManaFromBurst((be) => {
              let mana = be.persistentData.getInt("mana");
              return mana < CLOCK_MAX_MANA;
            })
            .receiveMana((be, amount) => {
              let currentMana = be.persistentData.getInt("mana");
              let received = Math.min(CLOCK_MAX_MANA - currentMana, amount);
              be.persistentData.putInt("mana", currentMana + received);
            })
            .getCurrentMana((be) => be.persistentData.getInt("mana"))
            .isFull((be) => {
              let mana = be.persistentData.getInt("mana");
              return mana >= CLOCK_MAX_MANA;
            })
        );
    });
});
