"""
Cities spanning latitude in both hemispheres, worldwide.

WHY THIS IS NO LONGER A SINGLE CORRIDOR
The first version held longitude inside a -25E to +50E band, on the argument
that fixing longitude isolates latitude as the only variable. Defensible, but it
bought that control at a heavy price: in the Europe-Africa corridor the land
stops at Cape Agulhas, so the southern group reached only -34 against the
north's +70. Roughly half the lever arm, on half as many cities, which is most
of why the southern fit came out weak.

That limit was a property of the corridor, not of the planet. Australia reaches
-43, New Zealand -46, South America -53. Adding Asia, Australasia and South
America roughly doubles the southern span and triples the southern sample, and
the cost is that longitude now varies too. That is the better trade: a weak fit
on a third of the range tells you very little, and continentality shows up as
scatter around the line rather than as a hidden bias in it.
"""

# (name, country, lat, lon)
NORTH = [
    ("Tromso", "Norway", 69.65, 18.96),
    ("Murmansk", "Russia", 68.97, 33.09),
    ("Reykjavik", "Iceland", 64.15, -21.94),
    ("Trondheim", "Norway", 63.43, 10.40),
    ("Helsinki", "Finland", 60.17, 24.94),
    ("Bergen", "Norway", 60.39, 5.32),
    ("Oslo", "Norway", 59.91, 10.75),
    ("Stockholm", "Sweden", 59.33, 18.07),
    ("Gothenburg", "Sweden", 57.71, 11.97),
    ("Riga", "Latvia", 56.95, 24.11),
    ("Edinburgh", "United Kingdom", 55.95, -3.19),
    ("Copenhagen", "Denmark", 55.68, 12.57),
    ("Vilnius", "Lithuania", 54.69, 25.28),
    ("Dublin", "Ireland", 53.35, -6.26),
    ("Berlin", "Germany", 52.52, 13.40),
    ("Amsterdam", "Netherlands", 52.37, 4.90),
    ("Warsaw", "Poland", 52.23, 21.01),
    ("London", "United Kingdom", 51.51, -0.13),
    ("Kyiv", "Ukraine", 50.45, 30.52),
    ("Prague", "Czechia", 50.08, 14.44),
    ("Paris", "France", 48.86, 2.35),
    ("Vienna", "Austria", 48.21, 16.37),
    ("Budapest", "Hungary", 47.50, 19.04),
    ("Milan", "Italy", 45.46, 9.19),
    ("Belgrade", "Serbia", 44.79, 20.45),
    ("Bucharest", "Romania", 44.43, 26.10),
    ("Rome", "Italy", 41.90, 12.50),
    ("Istanbul", "Turkey", 41.01, 28.98),
    ("Madrid", "Spain", 40.42, -3.70),
    ("Ankara", "Turkey", 39.93, 32.86),
    ("Athens", "Greece", 37.98, 23.73),
    ("Tunis", "Tunisia", 36.81, 10.17),
    ("Algiers", "Algeria", 36.75, 3.06),
    ("Tripoli", "Libya", 32.89, 13.19),
    ("Alexandria", "Egypt", 31.20, 29.92),
    ("Cairo", "Egypt", 30.04, 31.24),
    ("Dammam", "Saudi Arabia", 26.36, 49.99),
    ("Riyadh", "Saudi Arabia", 24.71, 46.68),
    ("Aswan", "Egypt", 24.09, 32.90),
    ("Jeddah", "Saudi Arabia", 21.49, 39.19),
    ("Port Sudan", "Sudan", 19.62, 37.22),
    ("Khartoum", "Sudan", 15.50, 32.56),
    ("Asmara", "Eritrea", 15.34, 38.93),
    ("N'Djamena", "Chad", 12.13, 15.06),
    ("Kano", "Nigeria", 12.00, 8.52),
    ("Djibouti", "Djibouti", 11.59, 43.15),
    ("Abuja", "Nigeria", 9.06, 7.49),
    ("Addis Ababa", "Ethiopia", 9.03, 38.74),
    ("Lagos", "Nigeria", 6.52, 3.38),
    ("Accra", "Ghana", 5.60, -0.19),
    ("Douala", "Cameroon", 4.05, 9.77),
    ("Kampala", "Uganda", 0.35, 32.58),
    # ---- Asia -------------------------------------------------------
    ("Yakutsk", "Russia", 62.03, 129.73),
    ("Ulaanbaatar", "Mongolia", 47.89, 106.91),
    ("Harbin", "China", 45.80, 126.53),
    ("Vladivostok", "Russia", 43.12, 131.89),
    ("Sapporo", "Japan", 43.06, 141.35),
    ("Beijing", "China", 39.90, 116.41),
    ("Seoul", "South Korea", 37.57, 126.98),
    ("Tokyo", "Japan", 35.68, 139.69),
    ("Xi'an", "China", 34.34, 108.94),
    ("Osaka", "Japan", 34.69, 135.50),
    ("Shanghai", "China", 31.23, 121.47),
    ("Chengdu", "China", 30.57, 104.07),
    ("Delhi", "India", 28.61, 77.21),
    ("Guangzhou", "China", 23.13, 113.26),
    ("Kolkata", "India", 22.57, 88.36),
    ("Hong Kong", "China", 22.32, 114.17),
    ("Mumbai", "India", 19.08, 72.88),
    ("Hyderabad", "India", 17.39, 78.49),
    ("Manila", "Philippines", 14.60, 120.98),
    ("Bangkok", "Thailand", 13.76, 100.50),
    ("Chennai", "India", 13.08, 80.27),
    ("Bengaluru", "India", 12.97, 77.59),
    ("Ho Chi Minh City", "Vietnam", 10.82, 106.63),
    ("Medan", "Indonesia", 3.59, 98.67),
    ("Kuala Lumpur", "Malaysia", 3.14, 101.69),
    ("Singapore", "Singapore", 1.35, 103.82),
]

SOUTH = [
    ("Libreville", "Gabon", 0.42, 9.47),          # just north, kept for continuity
    ("Nairobi", "Kenya", -1.29, 36.82),
    ("Kigali", "Rwanda", -1.94, 30.06),
    ("Bujumbura", "Burundi", -3.38, 29.36),
    ("Mombasa", "Kenya", -4.04, 39.67),
    ("Kinshasa", "DR Congo", -4.44, 15.27),
    ("Dar es Salaam", "Tanzania", -6.79, 39.21),
    ("Luanda", "Angola", -8.84, 13.23),
    ("Mbeya", "Tanzania", -8.91, 33.46),
    ("Lubumbashi", "DR Congo", -11.66, 27.48),
    ("Lilongwe", "Malawi", -13.98, 33.79),
    ("Lusaka", "Zambia", -15.42, 28.28),
    ("Blantyre", "Malawi", -15.79, 35.01),
    ("Livingstone", "Zambia", -17.85, 25.86),
    ("Harare", "Zimbabwe", -17.83, 31.05),
    ("Antananarivo", "Madagascar", -18.88, 47.51),
    ("Beira", "Mozambique", -19.84, 34.84),
    ("Bulawayo", "Zimbabwe", -20.15, 28.58),
    ("Windhoek", "Namibia", -22.56, 17.08),
    ("Walvis Bay", "Namibia", -22.96, 14.51),
    ("Polokwane", "South Africa", -23.90, 29.47),
    ("Gaborone", "Botswana", -24.65, 25.91),
    ("Pretoria", "South Africa", -25.75, 28.19),
    ("Maputo", "Mozambique", -25.97, 32.57),
    ("Johannesburg", "South Africa", -26.20, 28.05),
    ("Kimberley", "South Africa", -28.74, 24.77),
    ("Bloemfontein", "South Africa", -29.09, 26.16),
    ("Durban", "South Africa", -29.86, 31.02),
    ("East London", "South Africa", -33.02, 27.91),
    ("Cape Town", "South Africa", -33.92, 18.42),
    ("Gqeberha", "South Africa", -33.96, 25.60),
    # ---- Australasia and the Pacific --------------------------------
    ("Jakarta", "Indonesia", -6.21, 106.85),
    ("Surabaya", "Indonesia", -7.25, 112.75),
    ("Denpasar", "Indonesia", -8.65, 115.22),
    ("Port Moresby", "Papua New Guinea", -9.44, 147.18),
    ("Darwin", "Australia", -12.46, 130.84),
    ("Cairns", "Australia", -16.92, 145.77),
    ("Alice Springs", "Australia", -23.70, 133.88),
    ("Brisbane", "Australia", -27.47, 153.03),
    ("Perth", "Australia", -31.95, 115.86),
    ("Sydney", "Australia", -33.87, 151.21),
    ("Adelaide", "Australia", -34.93, 138.60),
    ("Canberra", "Australia", -35.28, 149.13),
    ("Auckland", "New Zealand", -36.85, 174.76),
    ("Melbourne", "Australia", -37.81, 144.96),
    ("Wellington", "New Zealand", -41.29, 174.78),
    ("Hobart", "Australia", -42.88, 147.33),
    ("Christchurch", "New Zealand", -43.53, 172.64),
    ("Dunedin", "New Zealand", -45.87, 170.50),
    # ---- South America ----------------------------------------------
    ("Lima", "Peru", -12.05, -77.04),
    ("La Paz", "Bolivia", -16.50, -68.15),
    ("Sao Paulo", "Brazil", -23.55, -46.63),
    ("Santiago", "Chile", -33.45, -70.67),
    ("Buenos Aires", "Argentina", -34.60, -58.38),
    ("Montevideo", "Uruguay", -34.90, -56.16),
    ("Bahia Blanca", "Argentina", -38.72, -62.27),
    ("Puerto Montt", "Chile", -41.47, -72.94),
    ("Punta Arenas", "Chile", -53.16, -70.91),
]

ALL = [(*c, "N") for c in NORTH] + [(*c, "S") for c in SOUTH]


def slug(name):
    return (name.lower().replace("'", "").replace(" ", "-"))


if __name__ == "__main__":
    print(f"north {len(NORTH)}  south {len(SOUTH)}  total {len(ALL)}")
    print(f"north latitudes {min(c[2] for c in NORTH):.1f} to {max(c[2] for c in NORTH):.1f}")
    print(f"south latitudes {min(c[2] for c in SOUTH):.1f} to {max(c[2] for c in SOUTH):.1f}")
    lons = [c[3] for c in ALL]
    print(f"longitude corridor {min(lons):.1f} to {max(lons):.1f}")
