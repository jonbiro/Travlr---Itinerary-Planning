class Api::V1::CitiesController < ApplicationController
  include ResourceScope

  before_action :find_city, only: [:show, :update, :destroy]

  def index
    @cities = City.where(trip_id: accessible_trips.select(:id))
    render json: @cities
  end

  # GET /cities/1
  def show
    render json: @city
  end

  # POST /cities
  def create
    trip = accessible_trips.find_by(id: city_params[:trip_id])
    return forbidden!("You must belong to the trip") unless trip

    @city = trip.cities.new(city_params.except(:trip_id))

    if @city.save
      render json: @city, status: :created
    else
      render json: @city.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /cities/1
  def update
    if @city.update(city_params.except(:trip_id))
      render json: @city
    else
      render json: @city.errors, status: :unprocessable_entity
    end
  end

  # DELETE /cities/1
  def destroy
    @city.destroy
    head :no_content
  end

  private

  def find_city
    @city = City.where(trip_id: accessible_trips.select(:id)).find_by(id: params[:id])
    not_found!("City") unless @city
  end

  def city_params
    params.require(:city).permit(:name, :lng, :lat, :trip_id)
  end
end
