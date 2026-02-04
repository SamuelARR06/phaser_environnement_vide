/***********************************************************************/
/** VARIABLES GLOBALES
/***********************************************************************/

var groupe_plateformes;
var player;
var clavier;
var groupe_etoiles;
var groupe_bombes;

var score = 0;
var zone_texte_score;

var gameOver = false;

// double saut
var nbSauts = 0;
var maxSauts = 2;

// troll niveau
var niveau = 1;
var trollDeclenche = false;

//
var texte_game_over;


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

  this.load.image("img_etoile", "src/assets/star.png");
  this.load.image("img_bombe", "src/assets/bomb.png");
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

  // clavier
  clavier = this.input.keyboard.createCursorKeys();

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

  // étoiles
  groupe_etoiles = this.physics.add.group();

  for (var i = 0; i < 10; i++) {
    var x = 70 + i * 70;
    groupe_etoiles.create(x, 10, "img_etoile");
  }

  this.physics.add.collider(groupe_etoiles, groupe_plateformes);

  groupe_etoiles.children.iterate(function (etoile) {
    etoile.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4));
  });

  this.physics.add.overlap(
    player,
    groupe_etoiles,
    ramasserEtoile,
    null,
    this
  );

  // score
  zone_texte_score = this.add.text(16, 16, "Score: 0", {
    fontSize: "32px",
    fill: "#000"
  });

  // bombes (VIDE AU NIVEAU 1)
  groupe_bombes = this.physics.add.group();
  this.physics.add.collider(groupe_bombes, groupe_plateformes);
  this.physics.add.collider(player, groupe_bombes, chocAvecBombe, null, this);

  // TEXTE GAME OVER (caché au départ)
texte_game_over = this.add.text(
  400,
  300,
  "GAME OVER",
  {
    fontSize: "120px",
    fill: "#ff0000",
    fontStyle: "bold"
  }
);

// centrage parfait
texte_game_over.setOrigin(0.5);

// au-dessus de tout
texte_game_over.setDepth(100);

// caché au départ
texte_game_over.setVisible(false);

}


/***********************************************************************/
/** UPDATE
/***********************************************************************/

function update() {

  if (gameOver) {
    return;
  }

  // reset double saut au sol
  if (player.body.touching.down) {
    nbSauts = 0;
  }

  // déplacements
  if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play("anim_gauche", true);

  } else if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play("anim_droite", true);

  } else {
    player.setVelocityX(0);
    player.anims.play("anim_face");
  }

  // double saut (UNE pression = UN saut)
  if (
    Phaser.Input.Keyboard.JustDown(clavier.space) &&
    nbSauts < maxSauts
  ) {
    player.setVelocityY(-330);
    nbSauts++;
  }
}

/***********************************************************************/
/** RAMASSER ÉTOILE + TROLL NIVEAU 2
/***********************************************************************/

function ramasserEtoile(player, etoile) {

  etoile.disableBody(true, true);

  score += 10;
  zone_texte_score.setText("Score: " + score);

  // FIN DU NIVEAU 1
  if (groupe_etoiles.countActive(true) === 0 && !trollDeclenche) {

    trollDeclenche = true;
    niveau = 2;

    // remettre les étoiles (niveau 2)
    groupe_etoiles.children.iterate(function (etoile) {
      etoile.enableBody(true, etoile.x, 0, true, true);
    });

    // cacher le score
    zone_texte_score.setVisible(false);

    // message troll
    var texte = this.add.text(
      400,
      300,
      "Bravo 🎉\nNIVEAU 2",
      {
        fontSize: "48px",
        fill: "#ff0000",
        align: "center"
      }
    );
    texte.setOrigin(0.5);

    // chaos après 1 seconde
    this.time.delayedCall(1000, function () {
      lancerChaos();
    }, [], this);
  }
}


/***********************************************************************/
/** CHAOS : 100 BOMBES
/***********************************************************************/

function lancerChaos() {

  for (var i = 0; i < 100; i++) {

    var x = Phaser.Math.Between(0, 800);

    var bombe = groupe_bombes.create(x, 16, "img_bombe");
    bombe.setBounce(1);
    bombe.setCollideWorldBounds(true);
    bombe.setVelocity(
      Phaser.Math.Between(-300, 300),
      Phaser.Math.Between(50, 300)
    );
    bombe.allowGravity = false;
  }
}

/***********************************************************************/
/** GAME OVER
/***********************************************************************/

function chocAvecBombe(player, bombe) {

  // stop total du jeu
  this.physics.pause();

  // effet visuel joueur
  player.setTint(0xff0000);
  player.anims.play("anim_face");

  // afficher GAME OVER géant
  texte_game_over.setVisible(true);
  zone_texte_score.setVisible(false);

  gameOver = true;
}
