import { registers as r } from "./constantes.js";
import { Generador } from "./generador.js";


/**
 * @param {Generador} code 
 */
export const concatString = (code) => {
    code.comment("Guardando en el stack la direccion en heap de la cadena concatenada")
    code.push(r.HP)


    code.comment("Copiando la 1er cadena en el heap")
    const end1 = code.getLabel()
    const loop1 = code.addLabel()

    code.lb(r.T1, r.A0)
    code.beq(r.T1, r.ZERO, end1)
    code.sb(r.T1, r.HP)
    code.addi(r.HP, r.HP, 1)
    code.addi(r.A0, r.A0, 1)
    code.j(loop1)
    code.addLabel(end1)

    code.comment("Copiando la 2da cadena en el heap")
    const end2 = code.getLabel()
    const loop2 = code.addLabel()

    code.lb(r.T1, r.A1)
    code.beq(r.T1, r.ZERO, end2)
    code.sb(r.T1, r.HP)
    code.addi(r.HP, r.HP, 1)
    code.addi(r.A1, r.A1, 1)
    code.j(loop2)
    code.addLabel(end2)

    code.comment("Agregando el caracter nulo al final")
    code.sb(r.ZERO, r.HP)
    code.addi(r.HP, r.HP, 1)

}

/**
 * @param {Generador} code 
 */
export const lessOrEqual = (code) => {

    const trueLabel = code.getLabel()
    const endLabel = code.getLabel()

    code.bge(r.T0, r.T1, trueLabel) // der >= izq
    code.li(r.T0, 0)
    code.push(r.T0)
    code.j(endLabel)
    code.addLabel(trueLabel)
    code.li(r.T0, 1)
    code.push(r.T0)
    code.addLabel(endLabel)

}

export const builtins = {
    concatString, 
    lessOrEqual
}

