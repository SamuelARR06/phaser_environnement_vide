/***********************************************************************/
/** VARIABLES GLOBALES
/***********************************************************************/
var groupe_plateformes;
var player;
var clavier;

// double saut
var nbSauts = 0;
var maxSauts = 2;

// tir
var boutonFeu;
var groupeBullets;

// cibles
var groupeCibles;

// bombes (qui tombent quand une cible est détruite)
var groupeBombes;

// fin de niveau
var texte_niveau_termine;
var niveauTermine = false;

// bouton restart
var bouton_recommencer;

// chrono
var chronoTexte;
var monTimer;
var chrono = 0;

// vies / game over
var touchesJoueur = 0;
var gameOver = false;
var texte_game_over;
var rotationGameOver = false;

/***********************************************************************/
/** CONFIGURATION PHASER
/***********************************************************************/
var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

new Phaser.Game(config);

/***********************************************************************/
/** PRELOAD
/***********************************************************************/
function preload() {
  this.load.image("img_ciel", "src/assets/sky.png");
  this.load.image("img_plateforme", "src/assets/platform.png");

  this.load.spritesheet("img_perso", "src/assets/dude.png", {
    frameWidth: 32,
    frameHeight: 48
  });

  this.load.image("bullet", "src/assets/balle.png");
  this.load.image("cible", "src/assets/cible.png");

  // bombe
  this.load.image("img_bombe", "src/assets/bomb.png");
}

/***********************************************************************/
/** CREATE
/***********************************************************************/
function create() {
  // reset état
  niveauTermine = false;
  chrono = 0;
  touchesJoueur = 0;
  gameOver = false;
  rotationGameOver = false;

  // fond
  this.add.image(400, 300, "img_ciel");

  // plateformes
  groupe_plateformes = this.physics.add.staticGroup();
  groupe_plateformes.create(200, 584, "img_plateforme");
  groupe_plateformes.create(600, 584, "img_plateforme");
  groupe_plateformes.create(50, 300, "img_plateforme");
  groupe_plateformes.create(600, 450, "img_plateforme");
  groupe_plateformes.create(750, 270, "img_plateforme");

  // joueur
  player = this.physics.add.sprite(100, 450, "img_perso");
  player.setCollideWorldBounds(true);
  player.setBounce(0.2);
  this.physics.add.collider(player, groupe_plateformes);

  // direction tir
  player.direction = "right";

  // clavier
  clavier = this.input.keyboard.createCursorKeys();
  boutonFeu = this.input.keyboard.addKey("A");

  // animations
  if (!this.anims.exists("anim_gauche")) {
    this.anims.create({
      key: "anim_gauche",
      frames: this.anims.generateFrameNumbers("img_perso", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: "anim_face",
      frames: [{ key: "img_perso", frame: 4 }],
      frameRate: 20
    });
    this.anims.create({
      key: "anim_droite",
      frames: this.anims.generateFrameNumbers("img_perso", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
  }

  // bullets
  groupeBullets = this.physics.add.group();

  // bombes : groupe + collisions "normales"
  groupeBombes = this.physics.add.group();
  this.physics.add.collider(groupeBombes, groupe_plateformes);
  this.physics.add.overlap(player, groupeBombes, toucheParBombe, null, this);

  // cibles
  groupeCibles = this.physics.add.group({
    key: "cible",
    repeat: 7,
    setXY: { x: 24, y: 0, stepX: 107 }
  });
  this.physics.add.collider(groupeCibles, groupe_plateformes);

  groupeCibles.children.iterate(function (c) {
    c.hits = 0;
    c.setBounce(1);
    c.y = Phaser.Math.Between(10, 250);
    c.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-120, 120));
    c.setCollideWorldBounds(true);
  });

  this.physics.add.overlap(groupeBullets, groupeCibles, hit, null, this);

  // bullets hors écran +2s
  this.physics.world.on("worldbounds", function (body) {
    var obj = body.gameObject;
    if (obj && groupeBullets.contains(obj)) {
      obj.destroy();
      if (!niveauTermine && !gameOver) {
        chrono += 2;
        if (chronoTexte) chronoTexte.setText("Chrono: " + chrono);
      }
    }
  });

  // messages
  texte_niveau_termine = this.add.text(400, 260, "NIVEAU TERMINE", {
    fontSize: "72px",
    fill: "#ff0000",
    fontStyle: "bold"
  }).setOrigin(0.5).setDepth(100).setVisible(false);

  texte_game_over = this.add.text(400, 300, "GAME OVER", {
    fontSize: "96px",
    fill: "#ff0000",
    fontStyle: "bold"
  }).setOrigin(0.5).setDepth(200).setVisible(false);

  // bouton recommencer
  bouton_recommencer = this.add.text(625, 12, "RECOMMENCER", {
    fontSize: "20px",
    fill: "#ffffff",
    backgroundColor: "#000000",
    padding: { x: 10, y: 6 }
  }).setScrollFactor(0).setDepth(300).setInteractive({ useHandCursor: true });

  bouton_recommencer.on("pointerover", function () {
    bouton_recommencer.setStyle({ backgroundColor: "#333333" });
  });
  bouton_recommencer.on("pointerout", function () {
    bouton_recommencer.setStyle({ backgroundColor: "#000000" });
  });

  var sceneRef = this;
  bouton_recommencer.on("pointerdown", function () {
    sceneRef.scene.restart();
  });

  // UI
  this.add.text(16, 44, "↑ double saut | A tirer | Raté: +2s | Bombes: 2 hits = mort", {
    fontSize: "18px",
    fill: "#000"
  });

  // chrono
  chronoTexte = this.add.text(16, 12, "Chrono: 0", {
    fontSize: "20px",
    fill: "#ffffff",
    backgroundColor: "#000000",
    padding: { x: 8, y: 4 }
  }).setScrollFactor(0).setDepth(300);

  monTimer = this.time.addEvent({
    delay: 1000,
    callback: compteUneSeconde,
    callbackScope: this,
    loop: true
  });
}

/***********************************************************************/
/** UPDATE
/***********************************************************************/
function update() {
  if (gameOver) {
    if (rotationGameOver) player.rotation += 0.25;
    return;
  }

  if (player.body.touching.down) nbSauts = 0;

  if (clavier.left.isDown) {
    player.direction = "left";
    player.setVelocityX(-160);
    player.anims.play("anim_gauche", true);
  } else if (clavier.right.isDown) {
    player.direction = "right";
    player.setVelocityX(160);
    player.anims.play("anim_droite", true);
  } else {
    player.setVelocityX(0);
    player.anims.play("anim_face");
  }

  if (Phaser.Input.Keyboard.JustDown(clavier.up) && nbSauts < maxSauts) {
    player.setVelocityY(-330);
    nbSauts++;
  }

  if (Phaser.Input.Keyboard.JustDown(boutonFeu)) {
    tirer(player);
  }
}

/***********************************************************************/
function compteUneSeconde() {
  if (gameOver) return;
  chrono += 1;
  if (chronoTexte) chronoTexte.setText("Chrono: " + chrono);
}

/***********************************************************************/
function tirer(player) {
  if (gameOver) return;
  var coefDir = (player.direction === "left") ? -1 : 1;

  var bullet = groupeBullets.create(player.x + (25 * coefDir), player.y - 4, "bullet");
  bullet.setCollideWorldBounds(true);
  bullet.body.onWorldBounds = true;
  bullet.body.allowGravity = false;
  bullet.setVelocity(1000 * coefDir, 0);
}

/***********************************************************************/
/** HIT cible : 2e hit => destruction + bombe tombe DU CIEL
/***********************************************************************/
function hit(bullet, cible) {
  bullet.destroy();

  cible.hits = (cible.hits || 0) + 1;

  if (cible.hits === 1) {
    cible.setBounce(0.25);
    if (cible.body) cible.setVelocity(cible.body.velocity.x * 0.35, cible.body.velocity.y * 0.35);
    cible.setTint(0xffaaaa);
  } else {
    var x = cible.x;
    cible.destroy();

    // bombe qui tombe du ciel, rebond "normal" comme les cibles
    tomberBombeDuCiel(x);

    if (groupeCibles.countActive(true) === 0) {
      texte_niveau_termine.setVisible(true);
      niveauTermine = true;
      if (monTimer) monTimer.reset({ paused: true });
    }
  }
}

/***********************************************************************/
/** Bombe : spawn en haut (y=0) et rebond "normal" (bounce=1) comme cibles
/***********************************************************************/
function tomberBombeDuCiel(x) {
  var bombe = groupeBombes.create(x, 0, "img_bombe");
  bombe.setBounce(1);
  bombe.setCollideWorldBounds(true);

  // petit mouvement horizontal, comme cibles
  bombe.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-120, 0));
}

/***********************************************************************/
/** Bombe touche joueur :
/** - 1er hit : rouge + bombe disparaît
/** - 2e hit : GAME OVER + animation "Mario"
/***********************************************************************/
function toucheParBombe(player, bombe) {
  bombe.destroy();
  if (gameOver) return;

  touchesJoueur++;

  if (touchesJoueur === 1) {
    player.setTint(0xff0000);
    player.scene.time.delayedCall(300, function () {
      if (!gameOver) player.clearTint();
    });
  } else {
    declencheGameOver(player.scene);
  }
}

/***********************************************************************/
function declencheGameOver(scene) {
  gameOver = true;
  niveauTermine = true;
  if (monTimer) monTimer.reset({ paused: true });

  texte_game_over.setVisible(true);

  player.anims.play("anim_face");
  player.setTint(0xff0000);

  // animation "Mario"
  player.setCollideWorldBounds(false);
  player.body.allowGravity = true;

  var dx = 400 - player.x;
  player.setVelocity(dx * 2.2, -520);

  rotationGameOver = true;
}