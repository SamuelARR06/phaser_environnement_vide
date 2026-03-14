/***********************************************************************/
/** BASE PHASER PLATEFORME + DOUBLE SAUT + TIR + CIBLES (PV)
/** + FIN : "NIVEAU TERMINE"
/** + BOUTON : "RECOMMENCER"
/** + CHRONO (timer) affiché à l’écran
/***********************************************************************/

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

// fin de niveau
var texte_niveau_termine;

// bouton restart
var bouton_recommencer;

// chrono
var chronoTexte;
var monTimer;
var chrono = 0;

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

  // assets tir/cibles
  this.load.image("bullet", "src/assets/balle.png");
  this.load.image("cible", "src/assets/cible.png");
}

/***********************************************************************/
/** CREATE
/***********************************************************************/
function create() {
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

  // direction par défaut (pour le tir)
  player.direction = "right";

  // clavier
  clavier = this.input.keyboard.createCursorKeys();
  boutonFeu = this.input.keyboard.addKey("A"); // A = tirer

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

  // groupe de balles
  groupeBullets = this.physics.add.group();

  // cibles (8 cibles espacées)
  groupeCibles = this.physics.add.group({
    key: "cible",
    repeat: 7,
    setXY: { x: 24, y: 0, stepX: 107 }
  });

  // collisions cibles / plateformes
  this.physics.add.collider(groupeCibles, groupe_plateformes);

  // paramètres cibles : 2 touches, rebond au départ, vitesse aléatoire
  groupeCibles.children.iterate(function (cibleTrouvee) {
    cibleTrouvee.hits = 0;
    cibleTrouvee.setBounce(1);
    cibleTrouvee.y = Phaser.Math.Between(10, 250);
    cibleTrouvee.setVelocity(
      Phaser.Math.Between(-200, 200),
      Phaser.Math.Between(-120, 120)
    );
    cibleTrouvee.setCollideWorldBounds(true);
  });

  // overlap balles/cibles => hit
  this.physics.add.overlap(groupeBullets, groupeCibles, hit, null, this);

  // détruire les balles hors écran
  this.physics.world.on("worldbounds", function (body) {
    var obj = body.gameObject;
    if (obj && groupeBullets.contains(obj)) obj.destroy();
  });

  // message fin de niveau (caché)
  texte_niveau_termine = this.add.text(400, 300, "NIVEAU TERMINE", {
    fontSize: "72px",
    fill: "#ff0000",
    fontStyle: "bold"
  });
  texte_niveau_termine.setOrigin(0.5);
  texte_niveau_termine.setDepth(100);
  texte_niveau_termine.setVisible(false);

  // bouton "RECOMMENCER" (haut droite)
  bouton_recommencer = this.add.text(625, 12, "RECOMMENCER", {
    fontSize: "20px",
    fill: "#ffffff",
    backgroundColor: "#000000",
    padding: { x: 10, y: 6 }
  });
  bouton_recommencer.setScrollFactor(0);
  bouton_recommencer.setDepth(200);
  bouton_recommencer.setInteractive({ useHandCursor: true });

  bouton_recommencer.on("pointerover", function () {
    bouton_recommencer.setStyle({ backgroundColor: "#333333" });
  });
  bouton_recommencer.on("pointerout", function () {
    bouton_recommencer.setStyle({ backgroundColor: "#000000" });
  });

  var sceneRef = this;
  bouton_recommencer.on("pointerdown", function () {
    // remet le chrono à 0 et restart la scène
    chrono = 0;
    if (chronoTexte) chronoTexte.setText("Chrono: " + chrono);
    sceneRef.scene.restart();
  });

  // UI commandes
  this.add.text(16, 44, "↑ double saut | (A) tirer | Cibles: 2 touches", {
    fontSize: "18px",
    fill: "#000"
  });

  /**********************/
  /** CHRONO (TIMER)   **/
  /**********************/
  chrono = 0;

  chronoTexte = this.add.text(16, 12, "Chrono: 0", {
    fontSize: "20px",
    fill: "#ffffff",
    backgroundColor: "#000000",
    padding: { x: 8, y: 4 }
  });
  chronoTexte.setScrollFactor(0);
  chronoTexte.setDepth(200);

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
  // reset double saut au sol
  if (player.body.touching.down) nbSauts = 0;

  // déplacements + direction
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

  // double saut
  if (Phaser.Input.Keyboard.JustDown(clavier.up) && nbSauts < maxSauts) {
    player.setVelocityY(-330);
    nbSauts++;
  }

  // tir (a)
  if (Phaser.Input.Keyboard.JustDown(boutonFeu)) {
    tirer(player);
  }
}

/***********************************************************************/
/** CHRONO : callback toutes les 1s
/***********************************************************************/
function compteUneSeconde() {
  chrono = chrono + 1;
  if (chronoTexte) chronoTexte.setText("Chrono: " + chrono);
}

/***********************************************************************/
/** TIRER
/***********************************************************************/
function tirer(player) {
  var coefDir = (player.direction === "left") ? -1 : 1;

  var bullet = groupeBullets.create(
    player.x + (25 * coefDir),
    player.y - 4,
    "bullet"
  );

  bullet.setCollideWorldBounds(true);
  bullet.body.onWorldBounds = true;
  bullet.body.allowGravity = false;
  bullet.setVelocity(1000 * coefDir, 0);
}

/***********************************************************************/
/** HIT : 1er hit => rebond ralenti, 2e hit => disparition
/** + si plus aucune cible => affiche "NIVEAU TERMINE"
/***********************************************************************/
function hit(bullet, cible) {
  bullet.destroy();

  cible.hits = (cible.hits || 0) + 1;

  if (cible.hits === 1) {
    cible.setBounce(0.25);
    if (cible.body) {
      cible.setVelocity(cible.body.velocity.x * 0.35, cible.body.velocity.y * 0.35);
    }
    cible.setTint(0xffaaaa);
  } else {
    cible.destroy();

    if (groupeCibles.countActive(true) === 0) {
      texte_niveau_termine.setVisible(true);

      // option : on stoppe le chrono quand le niveau est terminé
      if (monTimer) monTimer.reset({ paused: true });
    }
  }
}