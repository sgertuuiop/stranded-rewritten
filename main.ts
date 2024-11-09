// start level ID at -1
let currentLevelId = -1

// set level array
let levels: tiles.TileMapData[] = [
  tilemap`level1`,
  tilemap`level2`,
  tilemap`level3`,
  tilemap`level4`,
  tilemap`level5`,
  tilemap`boss_level`,
]

// define last level number
let bossLevel = 5

// define sprites
let player: Sprite = null
let enemy: Sprite = null
let projectile: Sprite = null

// initialize number of hits of boss
let bossHits = 0

// game stuff
info.setLife(3)
scene.setBackgroundColor(12)
scene.setBackgroundImage(assets.image`overworld_bg`)

// starting tilemap
tiles.setCurrentTilemap(tilemap`start_level`)

// extend SpriteKind
namespace SpriteKind {
  export const Boss = SpriteKind.create()
}

// create player
function makePlayer() {
  player = sprites.create(assets.image`protagonist`, SpriteKind.Player)
  controller.moveSprite(player, 100, 0)
  player.ay = 500
  scene.cameraFollowSprite(player)
  return player
}

// walking animations
controller.left.onEvent(ControllerButtonEvent.Pressed, () => {
  animation.runImageAnimation(player, assets.animation`walk_left`, 200, true)
})

controller.left.onEvent(ControllerButtonEvent.Released, () => {
  animation.stopAnimation(animation.AnimationTypes.All, player)
})

controller.right.onEvent(ControllerButtonEvent.Pressed, () => {
  animation.runImageAnimation(player, assets.animation`walk_right`, 200, true)
})

controller.right.onEvent(ControllerButtonEvent.Released, () => {
  animation.stopAnimation(animation.AnimationTypes.All, player)
})

// allow jumping
controller.A.onEvent(ControllerButtonEvent.Pressed, () => {
  player.vy = -185
})

// shoot bullets with B
controller.B.onEvent(ControllerButtonEvent.Pressed, () => {
  projectile = sprites.createProjectileFromSprite(
    assets.image`bullet`,
    player,
    250,
    0,
  )
})

// score increase
function scoreIncrease() {
  info.changeScoreBy(1)
  if (info.score() % 10 == 0) {
    lifeIncrease()
  }
}

function lifeIncrease() {
  info.changeLifeBy(1)
  music.play(
    music.melodyPlayable(music.powerUp),
    music.PlaybackMode.InBackground,
  )
}

// life decrease
function lifeDecrease() {
  info.changeLifeBy(-1)
  game.splash("OUCH! Lives remaining: " + info.life())
  tiles.placeOnRandomTile(player, assets.tile`start`)
}

// set game over animation
info.onLifeZero(() => {
  game.setGameOverEffect(false, effects.dissolve)
  game.gameOver(false)
})

// coin logic
scene.onOverlapTile(
  SpriteKind.Player,
  assets.tile`coin`,
  (_sprite, location) => {
    tiles.setTileAt(location, assets.tile`transparency`)
    music.play(
      music.melodyPlayable(music.magicWand),
      music.PlaybackMode.InBackground,
    )
    scoreIncrease()
  },
)

// gain life from chest
scene.onOverlapTile(
  SpriteKind.Player,
  sprites.dungeon.chestClosed,
  (_sprite, location) => {
    tiles.setTileAt(location, sprites.dungeon.chestOpen)
    lifeIncrease()
  },
)

// initialize enemies
function enemyInit() {
  for (let tile of tiles.getTilesByType(assets.tile`enemy_spawn`)) {
    enemy = sprites.create(assets.image`enemy`, SpriteKind.Enemy)
    tiles.placeOnTile(enemy, tile)
    enemy.follow(player, 30)
    enemy.ay = 500
  }
  for (let tile of tiles.getTilesByType(assets.tile`fenemy_spawn`)) {
    enemy = sprites.create(assets.image`flying_enemy`, SpriteKind.Enemy)
    tiles.placeOnTile(enemy, tile)
    enemy.follow(player, 30)
  }
}

// initialize boss
function bossInit() {
  for (let tile of tiles.getTilesByType(assets.tile`boss_spawn`)) {
    enemy = sprites.create(assets.image`boss_enemy`, SpriteKind.Boss)
    tiles.placeOnTile(enemy, tile)
    enemy.follow(player, 40)
  }
}

// all the ways to harm the player:

// fall into a pit
scene.onOverlapTile(SpriteKind.Player, assets.tile`hazard`, () => {
  game.gameOver(false)
})

// have an encounter with a less-than-friendly alien
sprites.onOverlap(SpriteKind.Player, SpriteKind.Enemy, (player, enemy) => {
  if (player.bottom < enemy.y) {
    sprites.destroy(enemy)
    scoreIncrease()
  } else {
    lifeDecrease()
  }
})

// kill enemy if hit by bullet, but do not award points
sprites.onOverlap(
  SpriteKind.Projectile,
  SpriteKind.Enemy,
  (_projectile, enemy) => sprites.destroy(enemy),
)

// kill enemy if it falls into pit
scene.onOverlapTile(
  SpriteKind.Enemy,
  assets.tile`hazard`,
  (sprite, _location) => {
    sprites.destroy(sprite)
  },
)

// reset player and boss on hit by player
function bossReset() {
  for (let player of sprites.allOfKind(SpriteKind.Player)) {
    sprites.destroy(player)
  }
  for (let boss of sprites.allOfKind(SpriteKind.Boss)) {
    sprites.destroy(boss)
  }
  makePlayer()
  tiles.placeOnRandomTile(player, assets.tile`boss_reset`)
  bossInit()
}

// BOSS ENCOUNTER!
sprites.onOverlap(SpriteKind.Player, SpriteKind.Boss, (player, boss) => {
  if (player.bottom < boss.y) {
    scoreIncrease()
    bossHits++
    sprites.destroy(boss)
    bossReset()
    if (bossHits >= 9) {
      sprites.destroy(boss)
      tiles.setTileAt(tiles.getTileLocation(20, 10), assets.tile`game_goal`)
    }
  } else {
    lifeDecrease()
  }
})

// win the game on touching flagpole
scene.onOverlapTile(SpriteKind.Player, assets.tile`game_goal`, () => {
  game.gameOver(true)
})

// initialize level
function levelInit() {
  for (let player of sprites.allOfKind(SpriteKind.Player)) {
    sprites.destroy(player)
  }
  for (let enemy of sprites.allOfKind(SpriteKind.Enemy)) {
    sprites.destroy(enemy)
  }
  makePlayer()
  tiles.placeOnRandomTile(player, assets.tile`start`)
  if (currentLevelId == bossLevel) {
    bossInit()
  } else {
    enemyInit()
  }
}

// go to next level
scene.onOverlapTile(
  SpriteKind.Player,
  assets.tile`level_goal`,
  (_sprite, location) => {
    tiles.setTileAt(location, assets.tile`transparency`)
    currentLevelId++
    if (currentLevelId < bossLevel) {
      game.splash("Level " + (currentLevelId + 1))
    } else {
      game.splash("FINAL LEVEL")
    }
    tiles.setCurrentTilemap(levels[currentLevelId])
    levelInit()
  },
)

// change A button used on dialogues
game.setDialogCursor(assets.image`a_button`)

// show splash
game.splash("- STRANDED -", "Rewritten")

// start first level
levelInit()
