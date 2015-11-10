(function() {
  // Homepage angular module.
  var app = angular.module('homePage');
  /* Controllers */
  // Welcome message controller
  app.controller('welcomeController', function() {
    this.message = "Welcome to Husky Robotics! We are a multi-disciplinary engineering group based at the \
    University of Washington in Seattle, WA. Our team participates in the University Rover Challenge, an \
    international rover competition, every spring."
  });


  /* Directives */
  // Directive that defines the Twitter feed.
  app.directive('twitterFeed', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/twitter-feed.html'
    }
  });

  // Directive that defines the slideshow.
  app.directive('slideshow', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/slideshow.html'
    }
  });

  // Directive that defines the footer.
  app.directive('myFooter', function() {
    return {
      restrict: 'E',
      templateUrl: 'templates/my-footer.html'
    }
  });
})();
