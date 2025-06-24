from sqlalchemy.orm import Session
from typing import Dict
import models.lawyer as lawyer_models
import models.legal_process as process_models
from datetime import date

# Um limiar para considerar as estatísticas de um advogado como relevantes
MIN_COMPLETED_PROCESSES_THRESHOLD = 3 # Exemplo: advogado precisa ter pelo menos 3 processos concluídos

def calculate_lawyer_delay_statistics(db: Session) -> Dict[int, Dict[str, any]]:
    """
    Calcula estatísticas de atraso para cada advogado com base em seus processos concluídos.

    Retorna um dicionário mapeando lawyer_id para outro dicionário com:
    {
        'delay_rate': float (0.0 a 1.0),  # Taxa de atraso
        'completed_with_info': int (número de processos concluídos com dados suficientes para cálculo)
    }
    """
    lawyer_stats = {}
    lawyers = db.query(lawyer_models.LawyerDB).all()

    for lawyer in lawyers:
        completed_processes_query = db.query(process_models.LegalProcessDB).filter(
            process_models.LegalProcessDB.lawyer_id == lawyer.id,
            process_models.LegalProcessDB.status == 'concluído',
            process_models.LegalProcessDB.delivery_deadline.isnot(None),
            process_models.LegalProcessDB.data_conclusao_real.isnot(None)
        )

        completed_processes_with_info = completed_processes_query.all()

        total_completed_with_info = len(completed_processes_with_info)
        total_delayed = 0

        if total_completed_with_info > 0:
            for process in completed_processes_with_info:
                # Garante que delivery_deadline e data_conclusao_real são objetos date
                # SQLAlchemy geralmente retorna objetos date/datetime corretos do banco.
                # Se viessem como string, precisariam ser convertidos com datetime.strptime.
                # Para este exemplo, assume-se que são objetos date.
                if isinstance(process.delivery_deadline, date) and isinstance(process.data_conclusao_real, date):
                    if process.data_conclusao_real > process.delivery_deadline:
                        total_delayed += 1
                else:
                    # Log ou tratamento se as datas não forem do tipo esperado (improvável com SQLAlchemy).
                    # Para simplificar, apenas decrementaria total_completed_with_info se uma data fosse inválida
                    # para não distorcer a taxa de atraso com dados incompletos.
                    # Ou pode-se simplesmente ignorar este processo na contagem.
                    # Aqui, considera-se que o filtro do SQLAlchemy já garante que não são None.
                    # A checagem de tipo é uma segurança adicional.
                    pass # Processos com datas inválidas não seriam contados como 'com informação' se essa lógica for mais rígida.

            delay_rate = (total_delayed / total_completed_with_info) if total_completed_with_info > 0 else 0.0
        else:
            delay_rate = 0.0 # Sem processos concluídos com informação, sem taxa de atraso.

        lawyer_stats[lawyer.id] = {
            'delay_rate': delay_rate,
            'completed_with_info': total_completed_with_info
        }

    return lawyer_stats

def get_process_delay_risk(lawyer_id: int, lawyer_delay_stats: Dict[int, Dict[str, any]]) -> str:
    """
    Determina o nível de risco de atraso para um processo com base nas estatísticas de atraso de seu advogado.
    """
    stats = lawyer_delay_stats.get(lawyer_id)

    if not stats or stats['completed_with_info'] < MIN_COMPLETED_PROCESSES_THRESHOLD:
        return "N/A" # Não há dados suficientes ou advogado não encontrado nas estatísticas.

    delay_rate = stats['delay_rate']

    if delay_rate > 0.5:
        return "Alto"
    elif delay_rate > 0.2: # (0.2 < taxa de atraso <= 0.5)
        return "Médio"
    else: # (taxa de atraso <= 0.2)
        return "Baixo"

# Exemplo de como poderia ser usado (apenas para fins de ilustração, não faz parte do módulo em si):
# if __name__ == '__main__':
#     # Isso exigiria uma sessão de BD configurada e modelos carregados
#     # from database import SessionLocal
#     # db = SessionLocal()
#     # try:
#     #     stats = calculate_lawyer_delay_statistics(db)
#     #     for lawyer_id, data in stats.items():
#     #         print(f"Advogado ID {lawyer_id}: Taxa de Atraso = {data['delay_rate']:.2f} ({data['completed_with_info']} processos)")
#     #         if data['completed_with_info'] >= MIN_COMPLETED_PROCESSES_THRESHOLD:
#     #             risk = get_process_delay_risk(lawyer_id, stats)
#     #             print(f"  Risco para novos processos: {risk}")
#     #         else:
#     #             print(f"  Risco para novos processos: N/A (menos de {MIN_COMPLETED_PROCESSES_THRESHOLD} processos concluídos)")
#     # finally:
#     #     db.close()
#     pass
