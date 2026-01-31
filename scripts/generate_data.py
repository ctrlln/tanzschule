import json
import random
import uuid

COURSE_TYPES = [
    "Rock'n'Roll", "Standard Latein", "Line Dance", "Salsa", "Bachata",
    "Discofox", "Argentine Tango", "West Coast Swing", "Hip Hop Adults", "Walzer Workshop"
]

FIRST_NAMES_MALE = [
    "Thomas", "Michael", "Andreas", "Stefan", "Markus", "Christian", "Alexander", "Martin",
    "Tobias", "Daniel", "Jan", "Dennis", "Tim", "Sebastian", "Florian", "Felix", "Lukas",
    "Jonas", "Max", "Paul", "Julian", "Leon", "Klaus", "Uwe", "Jürgen", "Bernd"
]

FIRST_NAMES_FEMALE = [
    "Sabine", "Sandra", "Julia", "Stefanie", "Nicole", "Christina", "Katharina", "Anna",
    "Maria", "Lisa", "Laura", "Sarah", "Jessica", "Melanie", "Monika", "Birgit", "Petra",
    "Claudia", "Anja", "Tanja", "Lena", "Sophie", "Hannah", "Lea", "Marie"
]

LAST_NAMES = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
    "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder",
    "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann", "Hartmann", "Lange"
]

def generate_phone():
    # German mobile format +49 1...
    prefix = random.choice(["151", "160", "170", "171", "175", "152", "162", "172", "173", "174"])
    number = "".join([str(random.randint(0, 9)) for _ in range(7)])
    return f"+49 {prefix} {number}"

def generate_person(gender):
    if gender == 'M':
        first_name = random.choice(FIRST_NAMES_MALE)
    else:
        first_name = random.choice(FIRST_NAMES_FEMALE)
    
    last_name = random.choice(LAST_NAMES)
    
    return {
        "id": str(uuid.uuid4()),
        "firstName": first_name,
        "lastName": last_name,
        "gender": gender,
        "age": random.randint(18, 65),
        "phone": generate_phone(),
        "partnerId": None
    }

def generate_data():
    courses = []
    
    for course_name in COURSE_TYPES:
        course = {
            "id": str(uuid.uuid4()),
            "name": course_name,
            "participants": []
        }
        
        # Target roughly 20 participants, vary between 16 and 24
        target_count = random.randint(16, 24)
        current_count = 0
        
        while current_count < target_count:
            # 80% chance of a couple, but only if we have room for 2
            if random.random() < 0.8 and (target_count - current_count) >= 2:
                # Create couple
                man = generate_person('M')
                woman = generate_person('F')
                
                man['partnerId'] = woman['id']
                woman['partnerId'] = man['id']
                
                course['participants'].append(man)
                course['participants'].append(woman)
                current_count += 2
            else:
                # Single
                gender = random.choice(['M', 'F'])
                person = generate_person(gender)
                course['participants'].append(person)
                current_count += 1
        
        courses.append(course)
        
    db_data = {"courses": courses}
    
    with open('mock_db.json', 'w', encoding='utf-8') as f:
        json.dump(db_data, f, indent=2, ensure_ascii=False)
        
    print(f"Generated {len(courses)} courses with {sum(len(c['participants']) for c in courses)} participants.")

if __name__ == "__main__":
    generate_data()
