# Lamps, intakes and trim measured off the reference end grids (grid.py),
# in the traced units. Replaces the earlier guesses wholesale.
def R(u0, v0, u1, v1): return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]

def apply(res):
    s = res['supra']; k = s['kit']
    s['lamps'] = [['headsilver', [[91.4, 12.4], [92.6, 12.95], [94.8, 13.0], [96.6, 12.5], [97.6, 11.6], [97.2, 10.6], [95.6, 10.2], [93.0, 10.3], [91.6, 11.2]]],
                  ['taildark', [[1.3, 14.8], [3.4, 14.6], [4.2, 15.6], [4.0, 16.8], [2.9, 17.2], [1.5, 17.0]]]]
    k['rbumper']['stock']['lamps'] = [['amber', R(6.5, 9.8, 9.4, 11.1)]]
    k['rbumper']['stock']['details'] = [['trim', [[1.2, 4.9], [6.8, 4.3], [6.8, 3.4], [2.8, 3.6]]]]
    k['fbumper']['stock']['lamps'] = [['amber', R(89.1, 6.7, 91.9, 7.9)]]
    k['fbumper']['stock']['details'] = [['intake', [[95.3, 8.1], [97.4, 8.1], [97.7, 7.2], [97.6, 4.6], [95.4, 4.6], [95.2, 7.0]]],
                                        ['trim', [[87.5, 2.4], [95.9, 2.4], [98.3, 3.0], [87.5, 3.0]]]]

    c = res['camss']; k = c['kit']
    c['lamps'] = [['headpro', [[92.2, 13.3], [94.4, 12.0], [97.2, 12.9], [98.7, 14.4], [96.0, 14.5]]],
                  ['taildark', [[2.0, 15.5], [5.3, 15.6], [7.1, 17.2], [6.5, 18.2], [2.0, 18.0]]]]
    k['rbumper']['stock']['lamps'] = [['red', R(10.4, 7.6, 11.0, 9.4)]]
    k['rbumper']['stock']['details'] = [['trim', [[0.6, 5.0], [7.2, 4.4], [7.2, 3.2], [2.6, 3.4]]]]
    k['fbumper']['stock']['lamps'] = [['amber', R(90.8, 8.5, 91.4, 9.6)], ['red', R(91.3, 6.8, 91.9, 8.4)], ['head', R(94.3, 8.0, 95.4, 8.4)]]
    k['fbumper']['stock']['details'] = [['intake', [[93.9, 4.8], [96.2, 4.8], [96.5, 7.9], [94.2, 7.9]]],
                                        ['trim', [[92.0, 2.8], [99.6, 2.9], [99.6, 3.4], [92.0, 3.4]]]]

    f = res['fox']; k = f['kit']
    f['lamps'] = [['amber', [[92.9, 11.0], [95.0, 11.0], [95.0, 13.3], [94.0, 12.6]]],
                  ['head', [[95.0, 11.0], [97.7, 11.0], [97.5, 13.5], [95.0, 13.3]]],
                  ['tailbox', R(1.8, 10.8, 5.6, 15.2)]]
    f['details'] = [d for d in f['details'] if d[0] != 'badge']
    k['rbumper']['stock']['details'] = [d for d in k['rbumper']['stock'].get('details', []) if d[0] == 'shade']
    k['fbumper']['stock']['details'] = [d for d in k['fbumper']['stock'].get('details', []) if d[0] != 'grille']

    h = res['hachi']; k = h['kit']
    h['lamps'] = [['tailbox', R(1.7, 18.4, 4.6, 20.3)], ['ambersmoke', R(1.7, 15.8, 4.6, 18.4)]]
    h['details'] = [d for d in h['details'] if d[0] not in ('badge', 'door')] + \
        [['trim', [[95.0, 18.4], [97.4, 20.4], [98.6, 20.5], [98.4, 19.0], [96.5, 18.4]]]]
    k['rbumper']['stock']['details'] = [['chrome', R(1.4, 5.5, 11.8, 6.7)]]
    k['fbumper']['stock']['lamps'] = [['amber', R(93.7, 14.4, 98.2, 15.1)], ['head', R(97.0, 11.3, 99.0, 12.0)]]
    k['fbumper']['stock']['details'] = [['intake', [[96.4, 6.3], [99.6, 6.9], [99.6, 8.5], [96.4, 8.3]]]]
