import _ from 'lodash';
import $ from 'jquery';

function slugify(str) {
  var slug = str.replace("@", "at").replace("&", "and").replace(".", "_").replace("/\W+/", "");
  return slug;
}

function extractContainerID(str) {
  var dockerIDPattern = /docker\:\/\/(.{12})/;
  return dockerIDPattern.exec(str)[1];
}

export class ClusterWorkloadsCtrl {
  /** @ngInject */
  constructor($scope, $injector, backendSrv, datasourceSrv, $q, $location, alertSrv) {
    this.$q = $q;
    this.backendSrv = backendSrv;
    this.datasourceSrv = datasourceSrv;
    this.$location = $location;

    this.pageReady = false;
    this.cluster = {};
    this.namespaces = [];
    this.namespace = "";
    this.daemonSets = [];
    this.replicationControllers = [];
    this.deployments = [];
    this.pods = [];

    if (!("cluster" in $location.search())) {
      alertSrv.set("no cluster specified.", "no cluster specified in url", 'error');
      return;
    }

    if ("namespace" in $location.search()) {
      this.namespace = $location.search().namespace;
    }

    this.getCluster($location.search().cluster)
      .then(clusterDS => {
        this.clusterDS = clusterDS;
        this.pageReady = true;
        this.getWorkloads();
      });
  }

  getCluster(id) {
    return this.backendSrv.get('api/datasources/'+id).then(ds => {
      this.cluster = ds;
      return this.datasourceSrv.get(ds.name);
    });
  }

  getWorkloads() {
    let namespace = this.namespace;
    this.clusterDS.getNamespaces().then(namespaces => {
      this.namespaces = namespaces;
    });
    this.clusterDS.getDaemonSets(namespace).then(daemonSets => {
      this.daemonSets = daemonSets;
    });
    this.clusterDS.getReplicationControllers(namespace).then(rc => {
      this.replicationControllers = rc;
    });
    this.clusterDS.getDeployments(namespace).then(deployments => {
      this.deployments = deployments;
    });
    this.clusterDS.getPods(namespace).then(pods => {
      this.pods = pods;
    });
  }

  componentHealth(component) {
    var health = "unhealthy";
    _.forEach(component.conditions, function(condition) {
      if ((condition.type === "Healthy") && (condition.status === "True")) {
        health = "healthy";
      }
    });
    return health;
  }

  isComponentHealthy(component) {
    return this.componentHealth(component) === "healthy";
  }

  goToPodDashboard(pod, evt) {
    var clickTargetIsLinkOrHasLinkParents = $(evt.target).closest('a').length > 0;
    if (clickTargetIsLinkOrHasLinkParents === false) {
      var containerIDs = _.map(pod.status.containerStatuses, (status) => {
        return extractContainerID(status.containerID);
      });
      this.$location.path("dashboard/db/kubernetes-container")
      .search({
        "var-datasource": this.cluster.jsonData.ds,
        "var-cluster": this.cluster.name,
        "var-node": slugify(pod.spec.nodeName),
        "var-container": containerIDs
      });
    }
  }

  goToPodInfo(pod, evt) {
    var clickTargetIsLinkOrHasLinkParents = $(evt.target).closest('a').length > 0;

    var closestElm = _.head($(evt.target).closest('div'));
    var clickTargetClickAttr = _.find(closestElm.attributes, {name: "ng-click"});
    var clickTargetIsNodeDashboard = clickTargetClickAttr ? clickTargetClickAttr.value === "ctrl.goToPodDashboard(pod, $event)" : false;
    if (clickTargetIsLinkOrHasLinkParents === false &&
        clickTargetIsNodeDashboard === false) {
      this.$location.path("plugins/raintank-kubernetes-app/page/pod-info")
      .search({
        "cluster": this.cluster.id,
        "namespace": slugify(pod.metadata.namespace),
        "pod": pod.metadata.name
      });
    }
  }
}

ClusterWorkloadsCtrl.templateUrl = 'components/clusters/partials/cluster_workloads.html';