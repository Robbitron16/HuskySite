(function() {
  angular.module('homePage', []);
  angular.module('aboutPage', []);
  var app = angular.module('panel', ['homePage', 'aboutPage']);

  /* Directives */
  // Directive that wraps the entire navigation bar.
  app.directive('navigationBar', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/navigation-bar.html'
    }
  });
  // Directive that manages the media icons on the toolbar.
  app.directive('iconManager', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/icon-manager.html',
      controller: function() {
        this.icons = ['images/mail.png', 'images/fb.png', 'images/twitter.png'];
        this.mediaSites = ['mail!', 'https://www.facebook.com/DUBotics', 'https://twitter.com/HuskyRobotic'];
        this.iconClick = function(filename) {
          var index = this.icons.indexOf(filename);
          if (index == 0) {
            window.open('mailto:washingtonroboticsteam@gmail.com');
          } else {
            window.location = this.mediaSites[index];
          }
        }
      },
      controllerAs: 'iconCtrl'
    }
  });

  /* Controllers */
  // Global controller that manages the buttons.
  app.controller('navController', function() {
    this.currentPage = 0;
    this.buttons = ['HOME', 'ABOUT', 'TEAM', 'SPONSORS', 'MEDIA'];
    this.linkClick = function(buttonName) {
      var index = this.buttons.indexOf(buttonName);
      this.currentPage = index;
    }
    this.isActive = function(buttonName) {
      var index = this.buttons.indexOf(buttonName);
      return this.currentPage == index;
    }
  });
})();
