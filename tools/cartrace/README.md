# Car tracing tools

Turns a clean side-profile image of a real car (white background, car facing
left) into a car definition for `www/js/cars.js`.

1. Put the reference image next to these scripts and add an entry to `cfg` in
   `trace.py`: file name, the y of the rocker/bumper bottom (`cut`) and a box
   around the greenhouse.
2. `python3 trace.py <name>` extracts the body silhouette (and a rough glass
   mask) and writes `<name>_trace.jpg` so you can check the outline.
3. In `gen.py`, give the front-most x, rear-most x and ground y of the car,
   then place windows, bumpers, lamps, seams and other details in image pixel
   coordinates. `python3 gen.py` converts everything to game units
   (`traced.json`), ready to paste into `ART` in `cars.js`.

Needs `pip install opencv-python-headless pillow numpy`. Reference images are
not committed: use photos you have the rights to use as a reference.
