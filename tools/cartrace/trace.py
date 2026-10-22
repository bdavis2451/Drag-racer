import numpy as np, cv2, json, sys
from PIL import Image
cfg = {
 # file, front faces left, rocker/bumper cut y, greenhouse box, glass rule, wheel circles (cx,cy,r)
 'fox': dict(f='fox_ref.jpg', cut=846, gh=(700, 1600, 368, 572), wheels=[(474, 755, 161), (1524, 760, 155)]),
 'cam': dict(f='cam_ref.jpg', cut=612, gh=(470, 1000, 318, 404), wheels=None),
}
name = sys.argv[1]; c = cfg[name]
rgb = np.asarray(Image.open(c['f']).convert('RGB')).astype(int)
H, W, _ = rgb.shape
lum = rgb.mean(2); sat = rgb.max(2) - rgb.min(2)
car = ((lum < 240) | (sat > 30)).astype(np.uint8)
car[c['cut']:, :] = 0
car = cv2.morphologyEx(car, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
car = (cv2.GaussianBlur(car.astype(np.float32), (0, 0), 3) > 0.5).astype(np.uint8)
cs, _ = cv2.findContours(car, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
body = max(cs, key=cv2.contourArea)
x0, y0, bw, bh = cv2.boundingRect(body)
print('body bbox', x0, y0, bw, bh)
# glass
gx0, gx1, gy0, gy1 = c['gh']
if name == 'fox': g = (sat < 45) & (lum < 200)
else: g = (lum < 199) & (sat < 12)
gm = np.zeros((H, W), np.uint8); gm[gy0:gy1, gx0:gx1] = g[gy0:gy1, gx0:gx1]
gm = cv2.morphologyEx(gm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
gm = cv2.morphologyEx(gm, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
gcs, _ = cv2.findContours(gm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
gcs = [g for g in gcs if cv2.contourArea(g) > 1500]
print('glass parts', [int(cv2.contourArea(g)) for g in gcs])
out = cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2BGR)
cv2.drawContours(out, [body], -1, (255, 0, 0), 2)
cv2.drawContours(out, gcs, -1, (0, 200, 0), 2)
cv2.imwrite(name + '_trace.jpg', out)
np.save(name + '_body.npy', body.reshape(-1, 2)); np.save(name + '_glass.npy', np.array([g.reshape(-1, 2) for g in gcs], dtype=object), allow_pickle=True)
