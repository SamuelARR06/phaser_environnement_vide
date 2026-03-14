/***********************************************************************/
/** BASE PHASER PLATEFORME + DOUBLE SAUT + TIR + CIBLES (PV)
/** - gauche / droite
/** - double saut (↑, 2 sauts max)
/** - A = tir
/** - balles détruites hors écran
/** - CIBLES : 2 touches => 1) rebond ralenti  2) disparition
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

  // groupe de balles
  groupeBullets = this.physics.add.group();

  // cibles (8)
  groupeCibles = this.physics.add.group({
    key: "cible",
    repeat: 7,
    setXY: { x: 24, y: 0, stepX: 107 }
  });

  // collisions cibles / plateformes
  this.physics.add.collider(groupeCibles, groupe_plateformes);

  // paramètres cibles : 2 touches, rebond au départ, vitesse aléatoire
  groupeCibles.children.iterate(function (cibleTrouvee) {
    cibleTrouvee.hits = 0; // nb de fois touchée
    cibleTrouvee.setBounce(1); // rebond fort au départ
    cibleTrouvee.y = Phaser.Math.Between(10, 250);

    // petit mouvement pour voir l'effet de rebond
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
    if (obj && groupeBullets.contains(obj)) {
      obj.destroy();
    }
  });

  // mini UI
  this.add.text(16, 16, "double saut/tirs/cibles avec 2PV", {
    fontSize: "20px",
    fill: "#000"
  });
}

/***********************************************************************/
/** UPDATE
/***********************************************************************/
function update() {
  // reset double saut au sol
  if (player.body.touching.down) {
    nbSauts = 0;
  }

  // déplacements + mise à jour direction
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

  // double saut (↑)
  if (Phaser.Input.Keyboard.JustDown(clavier.up) && nbSauts < maxSauts) {
    player.setVelocityY(-330);
    nbSauts++;
  }

  // tir (A)
  if (Phaser.Input.Keyboard.JustDown(boutonFeu)) {
    tirer(player);
  }
}

/***********************************************************************/
/** TIRER : créer une balle et l'envoyer dans la direction du joueur
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
/** HIT : touchage des cibles+ effets
/***********************************************************************/
function hit(bullet, cible) {
  // la balle disparaît à l'impact (comme ton code)
  bullet.destroy();

  // compteur de touches sur la cible
  cible.hits = (cible.hits || 0) + 1;

  if (cible.hits === 1) {
    // 1er hit : on "ralentit le rebond"
    // - on baisse le rebond
    // - on baisse la vitesse du rebond  
    cible.setBounce(0.25);

    if (cible.body) {
      cible.setVelocity(cible.body.velocity.x * 0.35, cible.body.velocity.y * 0.35);
    }

    //si la cible est touchée une premiere fois alors: teinte legerement rouge
    cible.setTint(0xffaaaa);
  } else {
    // 2e hit : la cible disparaît
    cible.destroy();
  }
}