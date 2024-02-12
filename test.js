class Player {
    constructor(name, skill, age){
        this.name = name,
        this.skill = skill,
        this.age = age
    }
}

const tamim = new Player('Tamim', 'Bat', 30)
const shakib = new Player('Shakib', 'All', 31)

console.log(tamim);
console.log(shakib.skill);