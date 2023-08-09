const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

const url = 'https://agenda-service.vercel.app/';

app.use(bodyParser.json());

function definirHorarioComercial(dataOriginal, horarioComercial) {
  // Converter horário comercial para horas e minutos
  var [horas, minutos] = horarioComercial.split(":").map(Number);

  // Criar uma nova cópia da data original
  var novaData = new Date(dataOriginal);

  // Definir o horário comercial desejado
  novaData.setUTCHours(horas, minutos, 0, 0);

  return novaData.toISOString();
}

app.post('/dialogflow-webhook', async (req, res) => {
  try {
    const intent = req.body.queryResult.intent.displayName;
    const outputContexts = req.body.queryResult.outputContexts[0].parameters;
    
    // "parameters": {
    //   "date.original": "10-08",
    //   "professionalId.original": "1",
    //   "horario_comercial": "10:00",
    //   "serviceId.original": "1",
    //   "professionalId": 1,
    //   "date": "2023-08-10T12:00:00-03:00",
    //   "horario_comercial.original": "10h00",
    //   "serviceId": 1
    // }
          
    let responseText;
    let res;

    switch (intent) {
      case 'FinalizaIntent':
        const date = definirHorarioComercial(outputContexts.date, outputContexts.horario_comercial);
        const appointmentData = {
          professionalId: outputContexts.professionalId,
          serviceId: outputContexts.serviceId,
          appointmentDateTime: date,
        };
        const response1 = await axios.post(`${url}scheduling/create-appointment`, appointmentData);

        if (response1.data.message === 'Appointment created successfully.') {
          responseText = 'Agendamento com sucesso.';
        } else {
          responseText = 'Agendamento sem sucesso.';
        }
        break;

      case 'DiaIntent':
        const availabilityData = {
          professionalId: outputContexts.professionalId,
          serviceId: outputContexts.serviceId,
        };
        res = await axios.get(`${url}scheduling/available-dates?`, { params: availabilityData });
        if(res.data.error) {
          responseText = 'Erro ao obter datas disponíveis.';
          break;
        }

        if (Array.isArray(res.data.result)) {
          responseText = res.data.result.join('\n');
        }
        break;

      case 'HoraIntent':
        const availableTimesData = {
          professionalId: outputContexts.professionalId,
          serviceId: outputContexts.serviceId,
          date: outputContexts.date.split('T')[0],
        };
        res = await axios.get(`${url}scheduling/available-times?`, { params: availableTimesData });

        if(res.data.error) {
          responseText = 'Erro ao obter horários disponíveis';
          break;
        }

        if (Array.isArray(res.data.result)){
          responseText = res.data.result.join('\n');
        }
        break;

      default:
        responseText = 'Intent desconhecida.';
    }

    const response = {
      fulfillmentText: responseText,
    };

    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ fulfillmentText: 'Ocorreu um erro.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
