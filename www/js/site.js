// Pages publiques : les anciens liens de l'application (layjou.com/#/jouer/…, liens des e-mails) ouvrent app.html.
if (location.hash.startsWith('#/')) {
  location.replace(`app.html${location.hash}`);
}
