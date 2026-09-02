# Readalong <sup>bèta</sup>
Read foreign languages along with native speakers. No tests, no rankings, no gamification. No nonsense. Just read along at your pace. That's it.

## Local preview

Readalong uses PHP includes for shared story chrome. Preview locally with PHP's built-in server from the repository root:

```bash
php -S 0.0.0.0:8000
```

Then open http://localhost:8000/ in your browser. The site does not work via `file://` or on static hosts such as GitHub Pages.

Before deploying to [readalong.io](https://readalong.io/), upload `php-check.php` to the site root and confirm it prints `php-ok` with a PHP version. Apache should serve directory URLs (for example `stories/story-one/`) and allow `.htaccess` rewrites for legacy `index.html` links.

## How to contribute
Your feedback is much appreciated! When trying out the Readalong bèta version you probably have some questions and suggestions. If you're familiar with GitHub you can create a new issue or upvote an existing one. Not sure how this works? You can always send an email to <a href="mailto:pepijngieles@proton.me?subject=I got some feedback for Readalong&body=Hi Pepijn,%0D%0A %0D%0A">pepijngieles@proton.me</a>.

## Download the mobile app
The Readalong app is made as a website that can be added to your mobile device's home screen. By doing this, you'll get a dedicated app icon and a full-screen experience, instead of using it in a browser tab. You can do this by opening [readalong.io](https://readalong.io/) and:

### On iOS in Safari
- Click on the share icon (arrow up in a box)
- Scroll down and select “Add to Home Screen”

### On Android in Chrome
- Tap the menu icon (three dots)
- Select “Add to Home screen”

### On Android in Firefox
- Touch and hold the URL in the address bar until a menu appears
- Select “Add Page Shortcut”

## Adding a new story

1. Create `stories/story-slug/content.php` with the `<article>` sentence markup.
2. Create `stories/story-slug/index.php` with a `$story` array and include the shell (see existing stories).
3. Add a list item on the homepage in `index.php`.
