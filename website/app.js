// ===== LAZY IMAGE DIRECTIVE =====
Vue.directive('lazy', {
  bind: function (el) {
    el.classList.add('lazy-img');
    el.setAttribute('loading', 'lazy');
  },
  inserted: function (el, binding) {
    function loadImage() {
      el.src = binding.value;
      el.onload = function () {
        el.classList.add('loaded');
        // Notify Vue instance
        var key = el.getAttribute('data-lazy-key');
        if (key && el.__vue_app__) {
          el.__vue_app__.$set(el.__vue_app__.imgLoaded, key, true);
        }
        // Also dispatch a custom event the app can listen for
        el.dispatchEvent(new CustomEvent('lazy-loaded', { detail: key }));
      };
      el.onerror = function () {
        el.classList.add('loaded');
      };
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadImage();
            observer.unobserve(el);
          }
        });
      }, { rootMargin: '200px' });
      observer.observe(el);
    } else {
      loadImage();
    }
  },
  update: function (el, binding) {
    if (binding.value !== binding.oldValue) {
      // Only trigger reload if the source actually changed and isn't already loaded
      if (el.src.indexOf(binding.value.replace('../', '')) === -1) {
        el.classList.remove('loaded');
        el.src = binding.value;
      }
    }
  }

});

// ===== VUE APP =====
new Vue({
  el: '#app',

  data: {
    bookIsOpen: false,
    currentSpread: 0,
    touchStartX: 0,
    touchStartY: 0,
    showSwipeHint: false,
    imgLoaded: {},
    isModalOpen: false,
    modalCard: null,
    cards: [],
  },

  computed: {
    categories: function () {
      if (!this.cards || this.cards.length === 0) return [];
      var cats = [];
      var currentCatName = null;
      var self = this;
      for (var i = 0; i < this.cards.length; i++) {
        var card = this.cards[i];
        if (!currentCatName || currentCatName !== card.category) {
          currentCatName = card.category;
          cats.push({
            name: card.category,
            title: card.category.replace(' \u2014 ', '\n').replace(' - ', '\n'),
            startIdx: i,
            count: 0,
            desc: self.getCategoryDesc(card.category),
            symbol: self.getCategorySymbol(card.category)
          });
        }
        cats[cats.length - 1].count++;
      }
      return cats;
    },
    spreads: function () {
      if (!this.cards || this.cards.length === 0) return [];
      var s = [{ type: 'toc' }];
      this.categories.forEach(function (cat, idx) {
        s.push({ type: 'category', catIndex: idx });
        for (var i = 0; i < cat.count; i++) {
          s.push({ type: 'card', cardIndex: cat.startIdx + i });
        }
      });
      return s;
    },
    spread: function () {
      if (!this.spreads || this.spreads.length === 0) return { type: 'toc' };
      return this.spreads[this.currentSpread];
    },


    currentCard: function () {
      if (this.spread.type === 'card') {
        return this.cards[this.spread.cardIndex];
      }
      return null;
    },

    leftPageNum: function () {
      return this.currentSpread === 0 ? '' : (this.currentSpread * 2);
    },

    rightPageNum: function () {
      return this.currentSpread === 0 ? '' : (this.currentSpread * 2 + 1);
    },

    progressWidth: function () {
      if (this.spreads.length <= 1) return '0%';
      return ((this.currentSpread / (this.spreads.length - 1)) * 100) + '%';
    }
  },

  watch: {
    currentSpread: function (newIdx) {
      // Preload adjacent spread images
      var self = this;
      [newIdx - 1, newIdx + 1].forEach(function (idx) {
        if (idx >= 0 && idx < self.spreads.length) {
          var s = self.spreads[idx];
          if (s.type === 'card') {
            var img = new Image();
            img.src = self.cards[s.cardIndex].image;
          }
        }
      });
    }
  },

  methods: {
    openBook: function () {
      if (this.bookIsOpen) return;
      this.bookIsOpen = true;
      this.currentSpread = 0;
      // Show swipe hint on mobile briefly
      if (window.innerWidth <= 640) {
        var self = this;
        this.showSwipeHint = true;
        setTimeout(function () { self.showSwipeHint = false; }, 3000);
      }
    },

    prevPage: function () {
      if (this.currentSpread > 0) this.currentSpread--;
    },

    nextPage: function () {
      if (this.currentSpread < this.spreads.length - 1) this.currentSpread++;
    },

    goToCard: function (cardIndex) {
      for (var i = 0; i < this.spreads.length; i++) {
        if (this.spreads[i].type === 'card' && this.spreads[i].cardIndex === cardIndex) {
          this.currentSpread = i;
          return;
        }
      }
    },

    tocTitle: function (cat) {
      return cat.name.replace(' \u2014 ', ' \u2014 ');
    },

    catTitleHtml: function (catIndex) {
      return this.categories[catIndex].name.replace(' \u2014 ', '<br>');
    },

    catSymbol: function (catIndex) {
      return this.getCategorySymbol(this.categories[catIndex].name);
    },

    getCategoryDesc: function (catName) {
      if (catName.includes("Golden Boss")) return "Supreme entities of the digital realm. Rare, powerful, and reality-bending.";
      if (catName.includes("AWS Cloud")) return "Architectural guardians of the infinite infrastructure.";
      if (catName.includes("Trap Card")) return "Logical paradoxes and philosophical spells to counter any strategy.";
      if (catName.includes("Programming Language")) return "The elemental forces of creation and logic made manifest.";
      return "Mysterious entities from the depths of the computer scientist's mind.";
    },

    getCategorySymbol: function (catName) {
      if (catName.includes("Golden Boss")) return '★';
      if (catName.includes("AWS Cloud")) return '☁';
      if (catName.includes("Trap Card")) return '⚖';
      if (catName.includes("Programming Language")) return '⚔';
      return '✶';
    },

    getStarClass: function (level) {
      var lv = parseInt(level) || 0;
      if (lv >= 10) return 'stars-legendary';
      if (lv >= 7) return 'stars-high';
      if (lv >= 5) return 'stars-mid';
      return 'stars-low';
    },

    onTouchStart: function (e) {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    },

    onTouchEnd: function (e) {
      if (!this.bookIsOpen) return;
      var dx = e.changedTouches[0].clientX - this.touchStartX;
      var dy = e.changedTouches[0].clientY - this.touchStartY;
      // Only trigger if horizontal swipe is dominant and > 50px
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) this.nextPage();
        else this.prevPage();
      }
    },

    onImageLoaded: function (key) {
      this.$set(this.imgLoaded, key, true);
    },

    formatArtwork: function (text) {
      if (!text) return '';
      return text
        .replace(/\[\[([^\]|]*?)(?:\|([^\]]*?))?\]\]/g, function (_, a, b) { return b || a; })
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>');
    },

    formatEffect: function (card) {
      if (card.effect && card.effect.trim()) return card.effect;
      if (card.rawMd) {
        // Targeted extraction: everything inside the "Card Text" section
        var effectMatch = card.rawMd.match(/## Card Text\n\n([\s\S]*?)\n\n##/);
        if (effectMatch) {
          var text = effectMatch[1];
          // 1. Remove blockquote symbols "> "
          text = text.replace(/^> /gm, '');
          // 2. Remove Bold headers like "**[MONSTER EFFECT]**"
          text = text.replace(/\*\*\[.*?\]\*\*/g, '');
          // 3. Convert [[Link]] to plain text
          text = text.replace(/\[\[(.*?)(?:\|.*?)?\]\]/g, '$1');
          // 4. Handle multiple lines/paragraphs
          text = text.trim().replace(/\n\n/g, '<br><br>').replace(/\n/g, ' ');
          return text;
        }
      }
      return "No effect text found.";
    },

    // Glitter burst at a point
    spawnGlitter: function (x, y, count, spread) {
      var container = document.getElementById('glitterContainer');
      var colors = ['#c9a84c', '#e8d48b', '#fff6d5', '#ffe09a', '#ffd700', '#ffffff'];
      count = count || 24;
      spread = spread || 100;
      for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        var isStar = Math.random() > 0.5;
        particle.className = 'glitter-particle ' + (isStar ? 'star' : 'circle');
        var color = colors[Math.floor(Math.random() * colors.length)];
        var size = Math.random() * 7 + 3;
        var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
        var dist = Math.random() * spread + 30;
        var gx = Math.cos(angle) * dist;
        var gy = Math.sin(angle) * dist - 20; // bias upward
        var dur = Math.random() * 0.6 + 0.6;
        var rot = Math.floor(Math.random() * 360);
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--gx', gx + 'px');
        particle.style.setProperty('--gy', gy + 'px');
        particle.style.setProperty('--dur', dur + 's');
        particle.style.setProperty('--rot', rot + 'deg');
        if (isStar) {
          var starSize = Math.random() * 4 + 2;
          particle.style.setProperty('--star-size', starSize + 'px');
          particle.style.setProperty('--star-color', color);
        } else {
          particle.style.width = size + 'px';
          particle.style.height = size + 'px';
          particle.style.background = color;
          particle.style.boxShadow = '0 0 ' + (size * 2) + 'px ' + color + ', 0 0 ' + (size * 4) + 'px ' + color;
        }
        container.appendChild(particle);
        (function (p) {
          setTimeout(function () { if (p.parentNode) p.remove(); }, 1500);
        })(particle);
      }
    },

    openBookWithGlitter: function (e) {
      var self = this;
      this.spawnGlitter(e.clientX, e.clientY, 45, 160);
      // Second delayed wave for extra drama
      setTimeout(function () {
        self.spawnGlitter(e.clientX, e.clientY, 25, 200);
      }, 150);
      this.openBook();
    },

    prevPageGlitter: function (e) {
      if (this.currentSpread > 0) {
        this.spawnGlitter(e.clientX, e.clientY, 18, 70);
        this.prevPage();
      }
    },

    nextPageGlitter: function (e) {
      if (this.currentSpread < this.spreads.length - 1) {
        this.spawnGlitter(e.clientX, e.clientY, 18, 70);
        this.nextPage();
      }
    },

    goToCardGlitter: function (e, cardIndex) {
      this.spawnGlitter(e.clientX, e.clientY, 20, 80);
      this.goToCard(cardIndex);
    },

    openModal: function (card) {
      this.modalCard = card;
      this.isModalOpen = true;
    },

    closeModal: function () {
      this.isModalOpen = false;
      var self = this;
      setTimeout(function() { self.modalCard = null; }, 300);
    }
  },

  mounted: function () {
    var self = this;

    // Inject the decorative Hogsmeade SVG background
    fetch('./hogsmeade.svg')
      .then(function (r) { return r.text(); })
      .then(function (svg) {
        var bg = document.getElementById('hogsmeadeBg');
        if (bg) bg.innerHTML = svg.replace(/<\?xml[^>]*\?>/, '');
      })
      .catch(function (err) { console.error('Failed to load hogsmeade.svg', err); });

    // Load cards from cards.json (generated from the Obsidian vault).
    // Single source of truth: obsidian/cards/*.md -> generate_cards.js -> cards.json
    fetch('./cards.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        // Normalize image paths so they resolve whether served from website/ (dev)
        // or from dist/ (build). The build step strips "../"; do the same at runtime.
        data.forEach(function (c) {
          if (c.image) c.image = c.image.replace(/^\.\.\//, './');
        });
        self.cards = data;
      })
      .catch(function (err) { console.error('Failed to load cards.json', err); });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (self.isModalOpen && e.key === 'Escape') {
        self.closeModal();
        return;
      }
      if (!self.bookIsOpen) {
        if (e.key === 'Enter' || e.key === ' ') self.openBook();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') self.prevPage();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') self.nextPage();
    });

    // Generate particles
    var container = document.getElementById('particles');
    for (var i = 0; i < 30; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
      p.style.animationDuration = (Math.random() * 15 + 10) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      container.appendChild(p);
    }

    // Listen for lazy-loaded events from directive
    this.$el.addEventListener('lazy-loaded', function (e) {
      if (e.detail) {
        self.$set(self.imgLoaded, e.detail, true);
      }
    });
  }
});
