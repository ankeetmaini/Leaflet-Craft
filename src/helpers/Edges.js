import { DivIcon, Marker, DomEvent, Point } from "leaflet";
import { polygons, modesKey, notifyDeferredKey, polygonID } from "../FreeDraw";
import { updateFor } from "./Layer";
import { CREATE, EDIT, DELETEPOINT } from "./Flags";
import mergePolygons, { fillPolygon } from "./Merge";
import { latLngsToClipperPoints } from "./Simplify";
import { createFor, removeFor } from "./Polygon";
import { pubSub } from "./PubSub";

/**
 * @method createEdges
 * @param {Object} map
 * @param {L.Polygon} polygon
 * @param {Object} options
 * @return {Array}
 */
export default function createEdges(map, polygon, options) {
  /**
   * @method fetchLayerPoints
   * @param polygon {Object}
   * @return {Array}
   */
  const fetchLayerPoints = polygon => {
    return polygon.getLatLngs()[0].map(latLng => {
      return map.latLngToLayerPoint(latLng);
    });
  };

  const markers = fetchLayerPoints(polygon).map(point => {
    const mode = map[modesKey];
    const icon = new DivIcon({
      className: `leaflet-edge ${
        mode & EDIT || mode & DELETEPOINT ? "" : "disabled"
      }`.trim()
    });
    const latLng = map.layerPointToLatLng(point);
    const marker = new Marker(latLng, { icon }).addTo(map);

    marker.on("contextmenu", () => {
      if (map[modesKey] & DELETEPOINT) {
        const newMarkers = markers.filter(m => m !== marker);
        const latLngArr = newMarkers.map(m => [
          m.getLatLng().lat,
          m.getLatLng().lng
        ]);

        removeFor(map, polygon);

        polygon.setLatLngs(latLngArr);
        const points = latLngsToClipperPoints(map, polygon.getLatLngs()[0]);

        const newLatLngs = points.map(model =>
          map.layerPointToLatLng(new Point(model.X, model.Y))
        );

        createFor(map, newLatLngs, options, true, polygon[polygonID], 0);
      }
    });

    // Disable the propagation when you click on the marker.
    DomEvent.disableClickPropagation(marker);

    marker.on("mousedown", async function mouseDown(e) {
      if (e.originalEvent.which === 3 && map[modesKey] & DELETEPOINT) {
        return;
      }

      if (!(map[modesKey] & EDIT)) {
        // Polygons can only be created when the mode includes edit.
        map.off("mousedown", mouseDown);
        return;
      }

      if (map[modesKey] & EDIT) {
        // Fire edit start event
        const response = await pubSub.publish("edit-start");
        if (response && response.interrupt) {
          return;
        }
      }

      // Disable the map dragging as otherwise it's difficult to reposition the edge.
      map.dragging.disable();

      /**
       * @method mouseMove
       * @param {Object} event
       * @return {void}
       */
      const mouseMove = event => {
        // Determine where to move the marker to from the mouse move event.
        const containerPoint = map.latLngToContainerPoint(event.latlng);
        const latLng = map.containerPointToLatLng(containerPoint);

        // Update the marker with the new lat/lng.
        marker.setLatLng(latLng);

        // ...And finally update the polygon to match the current markers.
        const latLngs = markers.map(marker => marker.getLatLng());
        polygon.setLatLngs(latLngs);
        polygon.redraw();
      };

      // Listen for the mouse move events to determine where to move the marker to.
      map.on("mousemove", mouseMove);

      /**
       * @method mouseUp
       * @return {void}
       */
      function mouseUp() {
        if (e.originalEvent.which === 3 && map[modesKey] & DELETEPOINT) {
          return;
        }

        if (!(map[modesKey] & CREATE)) {
          // Re-enable the dragging of the map only if created mode is not enabled.
          map.dragging.enable();
        }

        // Stop listening to the events.
        map.off("mouseup", mouseUp);
        map.off("mousedown", mouseDown);
        map.off("mousemove", mouseMove);

        // Attempt to simplify the polygon to prevent voids in the polygon.
        fillPolygon(map, polygon, options);

        // Merge the polygons if the options allow using a two-pass approach as this yields the better results.
        const merge = () =>
          mergePolygons(map, Array.from(polygons.get(map)), options);
        options.mergePolygons && merge() && merge();

        // Trigger the event for having modified the edges of a polygon, unless the `notifyAfterEditExit`
        // option is equal to `true`, in which case we'll defer the notification.
        options.notifyAfterEditExit
          ? (() => {
              // Deferred function that will be invoked by `modeFor` when the `EDIT` mode is exited.
              map[notifyDeferredKey] = () => updateFor(map, "edit");
            })()
          : updateFor(map, "edit");
      }

      // Cleanup the mouse events when the user releases the mouse button.
      // We need to listen on both map and marker, because if the user moves the edge too quickly then
      // the mouse up will occur on the map layer.
      map.on("mouseup", mouseUp);
      marker.on("mouseup", mouseUp);
    });

    return marker;
  });

  return markers;
}
